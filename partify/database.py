"""Copyright 2011 Fred Hatfull

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
along with Partify.  If not, see <http://www.gnu.org/licenses/>."""

from flaskext.sqlalchemy import SQLAlchemy

from partify import app

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///../tmp/test.db'

db = SQLAlchemy(app)

def init_db():
    import partify.models
    db.create_all()
    
def reinit_db():
    global db

    db = SQLAlchemy(app)
    db.create_all()

if __name__ == "__main__":
    init_db()