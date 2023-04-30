import sqlite3
from random import choices
from time import time

class connDB():
    def __init__(self):
        conn = sqlite3.connect("data.db")
        cursor = conn.cursor()
        cursor.execute('drop table if exists sessions;')
        cursor.execute('drop table if exists marks;')
        cursor.execute('create table sessions (id text, peers text, password text);')
        cursor.execute('create table marks ('+
                       'session_id text, peer_type integer, peer_id text, peer_name text, '+
                       'target text, mark numeric, comment text, timestamp numeric);')
        conn.commit()
        cursor.close()
        conn.close()

    def newSession(self, peers, password):
        conn = sqlite3.connect("data.db")
        cursor = conn.cursor()

        new_session_id = ''.join([str(i) for i in choices(range(10), k=4)])
        while cursor.execute('select * from sessions where id=?;', (new_session_id,)).fetchall():
            new_session_id = ''.join([str(i) for i in choices(range(10), k=4)])

        cursor.execute('insert into sessions values (?,?,?);', (new_session_id, ','.join(peers), password))
        conn.commit()
        cursor.close()
        conn.close()
        return new_session_id
    
    def sessionExists(self, session_id):
        conn = sqlite3.connect("data.db")
        cursor = conn.cursor()
        if_exist = not not cursor.execute('select id from sessions where id=?;', (session_id,)).fetchall()
        cursor.close()
        conn.close()
        return if_exist

    def getAllSessionInfo(self, session_id, password):
        conn = sqlite3.connect("data.db")
        cursor = conn.cursor()

        session_info = {}
        peers = cursor.execute('select peers from sessions where id=? and password=?;', (session_id, password)).fetchone()
        if not peers:
            session_info['failed'] = True
        else:
            session_info['peers'] = peers[0].split(',') if peers[0] else []
            session_info['all_marks'] = cursor.execute(
                'select * from marks where session_id=?;', (session_id,)
            ).fetchall()
        
        cursor.close()
        conn.close()
        return session_info

    def updateSession(self, session_id, peers):
        conn = sqlite3.connect("data.db")
        cursor = conn.cursor()

        cursor.execute('update sessions set peers=? where id=?;', (','.join(peers), session_id))
        conn.commit()
        cursor.close()
        conn.close()

    def newMarking(self, session_id, peer_type, peer_id, peer_name, target, mark, comment):
        conn = sqlite3.connect("data.db")
        cursor = conn.cursor()

        cursor.execute('insert into marks values (?,?,?,?,?,?,?,?);',
        (session_id, peer_type, peer_id, peer_name, target, mark, comment, time()))

        conn.commit()
        cursor.close()
        conn.close()

    def getPeerMarkInfo(self, session_id, peer_id, peer_name, peer_type):
        conn = sqlite3.connect("data.db")
        cursor = conn.cursor()
        info = {}
        info['marks'] = cursor.execute("select * from marks where session_id=? and"+
                                       " peer_id=? and peer_name=? and peer_type=?",
                                       (session_id, peer_id, peer_name, peer_type)).fetchall()
        info['peers'] = cursor.execute('select peers from sessions where id=?;', (session_id,)).fetchone()[0]
        info['peers'] = info['peers'].split(',') if info['peers'] else []
        cursor.close()
        conn.close()
        return info
    
    def updateMarking(self, session_id, peer_type, peer_id, peer_name, target, mark, comment):
        conn = sqlite3.connect("data.db")
        cursor = conn.cursor()

        cursor.execute('delete from marks where session_id=? and '+
                       'peer_id=? and peer_name=? and peer_type=? and target=?;', 
                            (session_id, peer_id, peer_name, peer_type, target))
        conn.commit()
        cursor.close()
        conn.close()
        self.newMarking(session_id, peer_type, peer_id, peer_name, target, mark, comment)
    
    def restoreSession(self, password, peers, csv):
        new_session = self.newSession(peers, password)

        conn = sqlite3.connect("data.db")
        cursor = conn.cursor()

        for peer_type, peer_id, peer_name, target, mark, comment in csv:
            self.newMarking(new_session, int(peer_type), str(peer_id), str(peer_name),
                            str(target), float(mark), str(comment))

        conn.commit()
        cursor.close()
        conn.close()
        
        return new_session