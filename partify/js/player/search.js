(function() {

  /*
Copyright 2011 Fred Hatfull

This file is part of Partify.

Partify is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Partify is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Partify.  If not, see <http://www.gnu.org/licenses/>.
*/;

  var $, Search, Track;
  var __slice = Array.prototype.slice, __hasProp = Object.prototype.hasOwnProperty, __indexOf = Array.prototype.indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (__hasProp.call(this, i) && this[i] === item) return i; } return -1; };

  $ = jQuery;

  $(function() {
    window.Partify = window.Partify || {};
    window.Partify.Search = new Search();
    return window.Partify.Search.skin_add_btns();
  });

  Search = (function() {

    Search.results = new Array();

    Search.results_display;

    Search.sortmode = {
      category: "",
      asc: true
    };

    function Search() {
      this.initializeFormHandlers();
      this.initializeSortHandlers();
      this.results_display = $("table#results_table > tbody");
      this.results = new Array();
      this.sortmode = {
        category: "",
        asc: true
      };
    }

    Search.prototype.initializeFormHandlers = function() {
      var _this = this;
      $("#track_search_form input:submit").button();
      $("#track_search_form").submit(function(e) {
        var album, artist, title;
        e.stopPropagation();
        title = $("input#search_title").val();
        artist = $("input#search_artist").val();
        album = $("input#search_album").val();
        _this.processSearch(title, artist, album);
        return false;
      });
      $("#track_search_form #clear_search").button();
      return $("#clear_search").click(function(e) {
        $("input#search_title").val("");
        $("input#search_artist").val("");
        return $("input#search_album").val("");
      });
    };

    Search.prototype.initializeSortHandlers = function() {
      var category, _i, _len, _ref, _results;
      var _this = this;
      _ref = ['title', 'artist', 'album'];
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        category = _ref[_i];
        _results.push((function(category) {
          return $("#results_header_" + category).click(function(e) {
            e.stopPropagation();
            if (_this.sortmode.category === category) {
              _this.sortmode.asc = !_this.sortmode.asc;
            } else {
              _this.sortmode.category = category;
              _this.sortmode.asc = true;
            }
            return _this.sortResultsBy(_this.sortmode.category, "artist", "album", "track", _this.sortmode.asc);
          });
        })(category));
      }
      return _results;
    };

    Search.prototype.sortResultsBy = function() {
      var categories, is_ascending, sortfn, _i;
      categories = 2 <= arguments.length ? __slice.call(arguments, 0, _i = arguments.length - 1) : (_i = 0, []), is_ascending = arguments[_i++];
      sortfn = function(a, b) {
        var category, cmp_val, _j, _len;
        cmp_val = 0;
        for (_j = 0, _len = categories.length; _j < _len; _j++) {
          category = categories[_j];
          if (cmp_val === 0) {
            (function(category) {
              if (a[category] < b[category]) cmp_val = -1;
              if (a[category] > b[category]) return cmp_val = 1;
            })(category);
          }
        }
        return cmp_val;
      };
      this.results.sort(sortfn);
      if (!is_ascending) this.results.reverse();
      this.updateResultsDisplay();
      return this.setSortIndicator();
    };

    Search.prototype.setSortIndicator = function() {
      this.clearSortIndicators();
      return $("#results_header_" + this.sortmode.category).append("<span id='sort_indicator_arrow' class='ui-icon ui-icon-triangle-1-" + (this.sortmode.asc ? 'n' : 's') + " grip' style='float:left'>&nbsp;</span>");
    };

    Search.prototype.clearSortIndicators = function() {
      return $("#sort_indicator_arrow").remove();
    };

    Search.prototype.processSearch = function(title, artist, album) {
      var request_data;
      var _this = this;
      this.results = new Array();
      this._show_wait_spinner();
      this.clearSortIndicators();
      this.sortmode = {
        category: "",
        asc: true
      };
      request_data = {};
      if (title !== "") request_data['title'] = title;
      if (artist !== "") request_data['artist'] = artist;
      if (album !== "") request_data['album'] = album;
      return $.ajax({
        url: '/track/search',
        type: 'GET',
        data: request_data,
        success: function(data) {
          var result, _i, _len, _ref;
          if (data.status === 'ok') {
            _ref = data.results;
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              result = _ref[_i];
              _this.results.push(new Track(result));
            }
            return _this.updateResultsDisplay();
          } else {
            return _this.updateResultsDisplay();
          }
        }
      });
    };

    Search.prototype.addTrack = function(spotify_url, row) {
      var _this = this;
      return $.ajax({
        url: '/queue/add',
        type: 'POST',
        data: {
          spotify_uri: spotify_url
        },
        success: function(data) {
          var btn;
          btn = row.children('td.result_add').children('button');
          if (data.status === 'ok') {
            btn.button('option', 'icons', {
              primary: 'ui-icon-check'
            });
            window.Partify.Player._synchroPoll();
            return window.Partify.Queues.UserQueue.update(data.queue);
          } else {
            return _this._addTrackFail(btn);
          }
        },
        error: function() {
          return _this._addTrackFail(row.children('td.result_add').children('button'));
        }
      });
    };

    Search.prototype.addAlbum = function(spotify_url, album_tracks) {
      var spotify_files, track, _i, _len;
      var _this = this;
      this.disableButton($("tr[id='" + album_tracks[0].file + "'] > td.result_album > button"));
      for (_i = 0, _len = album_tracks.length; _i < _len; _i++) {
        track = album_tracks[_i];
        this.disableRow($("tr[id='" + track.file + "']"));
      }
      spotify_files = (function() {
        var _j, _len2, _results;
        _results = [];
        for (_j = 0, _len2 = album_tracks.length; _j < _len2; _j++) {
          track = album_tracks[_j];
          _results.push(track.file);
        }
        return _results;
      })();
      return $.ajax({
        url: '/queue/add_album',
        type: 'POST',
        data: {
          spotify_files: spotify_files
        },
        traditional: 'true',
        success: function(data) {
          var track, _fn, _j, _len2;
          if (data.status === 'ok') {
            $("tr[id='" + album_tracks[0].file + "'] > td.result_album > button").button('option', 'icons', {
              primary: 'ui-icon-check'
            });
            _fn = function(track) {
              return $("tr[id='" + track.file + "'] > td.result_add > button").button('option', 'icons', {
                primary: 'ui-icon-check'
              });
            };
            for (_j = 0, _len2 = album_tracks.length; _j < _len2; _j++) {
              track = album_tracks[_j];
              _fn(track);
            }
            window.Partify.Player._synchroPoll();
            return window.Partify.Queues.UserQueue.update(data.queue);
          } else {
            return this.error();
          }
        },
        error: function() {
          var track, _j, _len2, _results;
          _this._addTrackFail($("tr[id='" + album_tracks[0].file + "'] > td.result_album > button"));
          _results = [];
          for (_j = 0, _len2 = album_tracks.length; _j < _len2; _j++) {
            track = album_tracks[_j];
            _results.push(_this._addTrackFail($("tr[id='" + track.file + "'] > td.result_add > button")));
          }
          return _results;
        }
      });
    };

    Search.prototype._addTrackFail = function(btn) {
      btn.addClass('ui-state-error');
      return btn.button('option', 'icons', {
        primary: 'ui-icon-alert'
      });
    };

    Search.prototype.updateResultsDisplay = function() {
      var pos, track, _fn, _i, _len, _len2, _ref, _ref2;
      var _this = this;
      this.results_display.empty();
      if (this.results.length > 0) {
        _ref = this.results;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          track = _ref[_i];
          this.buildResultRow(track);
        }
        if (this.sortmode.category !== "title") {
          _ref2 = this.results;
          _fn = function(track, pos) {
            var album_length, end_pos, last_track, start_pos, year, year_str;
            start_pos = pos;
            end_pos = pos;
            while (start_pos > 0) {
              if (_this.results[start_pos - 1].album === track.album) {
                start_pos -= 1;
              } else {
                break;
              }
            }
            while (end_pos < _this.results.length - 1) {
              if (_this.results[end_pos + 1].album === track.album) {
                end_pos += 1;
              } else {
                break;
              }
            }
            album_length = (end_pos - start_pos) + 1;
            if (album_length > 4) {
              if (track.album === _this.results[Math.max(pos - 1, 0)].album && track.file !== _this.results[Math.max(pos - 1, 0)].file) {
                $("tr[id='" + track.file + "'] > td.result_album").remove();
              } else {
                $("tr[id='" + track.file + "'] > td.result_album").attr('rowspan', album_length);
                $("tr[id='" + track.file + "'] > td.result_album").addClass('album_details');
                $("tr[id='" + track.file + "'] > td.result_album");
                year = yearFromDateString(track.date);
                year_str = year !== "" && year > 0 ? "(" + year + ")" : "";
                $("tr[id='" + track.file + "'] > td.result_album").prepend("                                <img id='" + track.file + "' src='/static/img/loading.gif' />");
                $("tr[id='" + track.file + "'] > td.result_album > a").wrap("<p></p>");
                $("tr[id='" + track.file + "'] > td.result_album > p").append(" " + year_str);
                $("tr[id='" + track.file + "'] > td.result_album").append("                                <button class='album_add_btn'>Add Album</button>                                ");
                last_track = _this.results[pos + album_length - 1];
                window.Partify.LastFM.album.getInfo({
                  artist: track.artist,
                  album: track.album
                }, {
                  success: function(data) {
                    var image, image_sizes, images, img_element, img_url, target_size, _ref3;
                    images = (_ref3 = data.album) != null ? _ref3.image : void 0;
                    if (images != null) {
                      image_sizes = (function() {
                        var _j, _len3, _results;
                        _results = [];
                        for (_j = 0, _len3 = images.length; _j < _len3; _j++) {
                          image = images[_j];
                          _results.push(image.size);
                        }
                        return _results;
                      })();
                      target_size = "large";
                      if (__indexOf.call(image_sizes, target_size) >= 0) {
                        img_url = (function() {
                          var _j, _len3, _results;
                          _results = [];
                          for (_j = 0, _len3 = images.length; _j < _len3; _j++) {
                            image = images[_j];
                            if (image.size === target_size) {
                              _results.push(image['#text']);
                            }
                          }
                          return _results;
                        })();
                        img_url = img_url[0];
                        img_element = $("tr[id='" + track.file + "'] > td.result_album img[id='" + track.file + "']");
                        img_element.attr('src', img_url);
                        img_element.bind('load', function(e) {
                          img_element.addClass('album_image');
                          img_element.attr('width', 174);
                          img_element.attr('height', 174);
                          if ((4 < album_length && album_length < 8)) {
                            $("tr[id='" + last_track.file + "']").after("<tr class='album_padding'><td colspan=5>&nbsp;</td></tr>");
                            return $("tr[id='" + track.file + "'] > td.result_album").attr('rowspan', album_length + 1);
                          }
                        });
                        if (img_url === "") return img_element.remove();
                      }
                    }
                  },
                  error: function(code, message) {
                    return img_element.remove();
                  }
                });
                $("tr[id='" + track.file + "'] > td.result_album > button").button({
                  icons: {
                    primary: 'ui-icon-plus'
                  },
                  text: true
                });
                $("tr[id='" + track.file + "'] > td.result_album > button").click(function(e) {
                  return _this.addAlbum(track.file, _this.results.slice(pos, (pos + album_length)));
                });
              }
            }
            if (track.album !== _this.results[Math.max(pos - 1, 0)].album) {
              return $("tr[id='" + track.file + "'] > td").addClass('album_seperator');
            }
          };
          for (pos = 0, _len2 = _ref2.length; pos < _len2; pos++) {
            track = _ref2[pos];
            _fn(track, pos);
          }
        }
        $("table#results_table td:not(.album_details)").hover(function(e) {
          console.log($(e.currentTarget).parents("tr").first());
          return $(e.currentTarget).parents("tr").first().children("td:not(.album_details)").addClass('highlight');
        }, function(e) {
          return $(e.currentTarget).parents("tr").first().children("td:not(.album_details)").removeClass('highlight');
        });
      } else {
        this.buildEmptyResultRow();
      }
      return this.skin_add_btns();
    };

    Search.prototype.buildResultRow = function(track) {
      var row_html;
      var _this = this;
      row_html = "        <tr id='" + track.file + "'>            <td class='small result_album'><a href='#'>" + track.album + "</a></td>            <td class='small result_artist'><a href='#'>" + track.artist + "</a></td>            <td class='small result_title'>" + track.title + "</td>            <td class='small result_time'>" + (secondsToTimeString(track.time)) + "</td>            <td class='small result_track'>" + track.track + "</td>            <td class='small result_add'><button class='add_btn'></button></td>        </tr>        ";
      this.results_display.append(row_html);
      $("tr[id='" + track.file + "'] td.result_album a").click(function(e) {
        e.stopPropagation();
        $("input#search_artist").val(track.artist);
        $("input#search_album").val(track.album);
        $("input#search_title").val("");
        return _this.processSearch("", track.artist, track.album);
      });
      return $("tr[id='" + track.file + "'] td.result_artist a").click(function(e) {
        e.stopPropagation();
        $("input#search_artist").val(track.artist);
        $("input#search_title").val("");
        $("input#search_album").val("");
        return _this.processSearch("", track.artist, "");
      });
    };

    Search.prototype.buildEmptyResultRow = function() {
      var row_html;
      row_html = "        <tr>            <td colspan='6' class='results_empty small'>                <center><em>No results found. Please try a different search using the form above.</em></center>            </td>        </tr>";
      return this.results_display.append(row_html);
    };

    Search.prototype.skin_add_btns = function() {
      var _this = this;
      $("button.add_btn").button({
        icons: {
          primary: 'ui-icon-plus'
        },
        text: false
      });
      return $("button.add_btn").click(function(e) {
        var spotify_url, track_row;
        track_row = $(e.currentTarget).parent('td').parent('tr').first();
        spotify_url = track_row.attr('id');
        _this.disableRow(track_row);
        return _this.addTrack(spotify_url, track_row);
      });
    };

    Search.prototype.disableRow = function(row) {
      return this.disableButton(row.children('td.result_add').children('button'));
    };

    Search.prototype.disableButton = function(btn) {
      btn.button('disable');
      return btn.button('option', 'icons', {
        primary: 'ui-icon-loading'
      });
    };

    Search.prototype._show_wait_spinner = function() {
      this.results_display.empty();
      return this.results_display.append("        <tr>            <td colspan='6' class='results_empty'>                <center><img src='/static/img/loading.gif'></img></center>            </td>        </tr>        ");
    };

    return Search;

  })();

  Track = (function() {

    Track.id = 0;

    Track.title = "";

    Track.artist = "";

    Track.album = "";

    Track.track = "";

    Track.file = "";

    Track.time = "";

    Track.date = "";

    Track.length = "";

    Track.user = "";

    Track.user_id = 0;

    Track.playback_priority = 0;

    Track.user_priority = 0;

    Track.mpd_id = 0;

    Track.time_played = 0;

    Track.history_is_playing = false;

    function Track(data) {
      this.id = parseInt(data.id) || data.id;
      this.title = data.title;
      this.artist = data.artist;
      this.album = data.album;
      this.track = parseInt(data.track) || data.track;
      this.file = data.file;
      this.time = parseInt(data.time) || data.time;
      this.date = data.date;
      this.length = data.length;
      this.user = data.user;
      this.username = data.username;
      this.user_id = data.user_id;
      this.playback_priority = data.playback_priority;
      this.user_priority = data.user_priority;
      if (data.mpd_id) this.mpd_id = data.mpd_id;
      if (data.time_played) this.time_played = data.time_played;
      this.history_is_playing = data.is_playing;
    }

    return Track;

  })();

}).call(this);
