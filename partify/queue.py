"""This file provides endpoints for queue management as well as queue-related algorithms and internal management."""
import json
import logging
import urllib2
from itertools import izip_longest

from flask import redirect, request, session, url_for
from sqlalchemy.event import listens_for

from database import db_session
from decorators import with_authentication
from decorators import with_mpd
from partify import app
from partify.models import PlayQueueEntry
from partify.models import Track

@app.route('/queue/add', methods=['POST'])
@with_authentication
def add_to_queue():
    """For right now, just take a spotfy URL and add the track to the play queue..."""

    spotify_uri = request.form['spotify_uri']
    existing_tracks = Track.query.filter(Track.spotify_url == spotify_uri).all()

    if len(existing_tracks) == 0:
        # If we have a track that does not already have a Track entry with the same spotify URI, then we need get the information from Spotify and add one.
        
        # Look up the info from the Spotify metadata API
        spotify_request_url = "http://ws.spotify.com/lookup/1/.json?uri=%s" % spotify_uri
        raw_response = urllib2.urlopen(spotify_request_url).read()

        response = json.loads(raw_response)

        # TODO: When this becomes a JSON response, chain together dict references using .get and check for Nones at the end
        track_info = {
            'title': response['track']['name'],
            'artist': ', '.join(artist['name'] for artist in response['track']['artists']),
            'album': response['track']['album']['name'],
            'spotify_url': spotify_uri
        }
        track = Track(**track_info)
        db_session.add( track )
    else:
        track = existing_tracks[0]
    
    # Add the track to the play queue
    db_session.add( PlayQueueEntry(track=track, user_id=session['user']['id']) )
    db_session.commit()

    return redirect(url_for('player'))

@listens_for(PlayQueueEntry, 'after_insert')
@with_mpd
def _ensure_mpd_playlist_consistency(mpd, const, table, added_track):
    """This function is responsible for maintaining consistency between the Mopidy play queue and the Partify play queue.

    * The partify play queue should be authoritative. That is, Mopidy's playlist should match Paritfy's, NOT the other way around.
    * Tracks should only be added/deleted if necessary to ensure smoothness on the Mopidy side of things. To start, it will be easiest to NEVER remove
      the currently playing track since we won't need to mess with player state that way.
    """
    playlist_tracks = mpd.playlistinfo()
    queued_tracks = PlayQueueEntry.query.order_by(PlayQueueEntry.playback_priority).all()
    mpd_playlist_length = len(playlist_tracks)
    position = 0
    diverged = False
    for (queued_track, playlist_track) in izip_longest(queued_tracks, playlist_tracks):
        # Violating constraint #2
        # TODO: A better diffing algorithm that has to do less Mopidy work,
        # This is really pretty ugly but I'm tired.

        if not diverged:
            playlist_track_spotify_url = playlist_track.get('file', None) if playlist_track is not None else None
            # find the first point at which the two lists diverge
            if queued_track.track.spotify_url != playlist_track_spotify_url:
                # Remove all entries after this position in the MPD playlist
                if mpd_playlist_length > 0:
                    mpd.delete("%d:" % position)
                diverged = True
        if diverged:
            app.logger.debug("Adding %r" % queued_track.track.spotify_url)
            mpd.add(queued_track.track.spotify_url)

        position += 1

    # If the player is not playing... start it!
    mpd.play()
