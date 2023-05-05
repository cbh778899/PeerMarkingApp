import sqlite3
from random import choices
from time import time

class connDB():
    def __init__(self):
        conn = sqlite3.connect("data.db")
        cursor = conn.cursor()
        cursor.execute('drop table if exists sessions;')
        cursor.execute('drop table if exists marks;')
        cursor.execute('drop table if exists groups;')
        cursor.execute('create table sessions (id text, password text, current_group text);')
        cursor.execute('create table groups (session_id text, name text, peers text, unique(session_id, name));')
        cursor.execute('create table marks ('+
                       'session_id text, peer_type integer, peer_id text, peer_name text, '+
                       'target text, target_group text, mark numeric, comment text, timestamp numeric);')
        conn.commit()
        cursor.close()
        conn.close()

    def newSession(self, groups, password):
        conn = sqlite3.connect("data.db")
        cursor = conn.cursor()

        new_session_id = ''.join([str(i) for i in choices(range(10), k=4)])
        while cursor.execute('select * from sessions where id=?;', (new_session_id,)).fetchall():
            new_session_id = ''.join([str(i) for i in choices(range(10), k=4)])

        cursor.execute('insert into sessions values (?,?,?);', (new_session_id, password, groups[0]['name'] if groups else ''))
        if groups:
            for group in groups:
                cursor.execute('insert into groups values (?,?,?);', (new_session_id, group['name'], ','.join(group['peers'])))

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

        certification = cursor.execute('select * from sessions where id=? and password=?;', (session_id, password)).fetchone()
        if not certification:
            session_info['failed'] = True
        else:
            session_info = {}
            groups = cursor.execute('select name, peers from groups where session_id=?;', (session_id,)).fetchall()
            session_info['groups'] = [{'name': name, 'peers': peers.split(',')} for name, peers in groups]

            session_info['all_marks'] = cursor.execute(
                'select * from marks where session_id=?;', (session_id,)
            ).fetchall()
        
        cursor.close()
        conn.close()
        return session_info

    def updateSession(self, session_id, groups, update_group_name):
        conn = sqlite3.connect("data.db")
        cursor = conn.cursor()

        if update_group_name:
            cursor.execute('update groups set name=? where session_id=? and name=?;', (
                update_group_name[1], session_id, update_group_name[0]
            ))
        for i in groups:
            # update first, will fail without error if not exist
            cursor.execute('update groups set peers=? where session_id=? and name=?;', (
                ','.join(i['peers']), session_id, i['name']))
            # insert using the same settings, will fail without error if already exist (success update)
            cursor.execute('insert or ignore into groups values (?,?,?);', (
                session_id, i['name'], ','.join(i['peers'])))
            
        conn.commit()
        cursor.close()
        conn.close()

    def newMarking(self, session_id, peer_type, peer_id, peer_name, target, target_group, mark, comment):
        conn = sqlite3.connect("data.db")
        cursor = conn.cursor()

        cursor.execute('insert into marks values (?,?,?,?,?,?,?,?,?);',
        (session_id, peer_type, peer_id, peer_name, target, target_group, mark, comment, time()))

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
        groups = cursor.execute('select name, peers from groups where session_id=?;', (session_id,)).fetchall()
        info['groups'] = []
        for i in groups:
            info['groups'].append({'name': i[0], 'peers': i[1]})
        
        cursor.close()
        conn.close()
        return info
    
    def updateMarking(self, session_id, peer_type, peer_id, peer_name, target, target_group, mark, comment):
        conn = sqlite3.connect("data.db")
        cursor = conn.cursor()

        cursor.execute('delete from marks where session_id=? and '+
                       'peer_id=? and peer_name=? and peer_type=? and target=? and target_group=?;', 
                            (session_id, peer_id, peer_name, peer_type, target, target_group))
        conn.commit()
        cursor.close()
        conn.close()
        self.newMarking(session_id, peer_type, peer_id, peer_name, target, target_group, mark, comment)
    
    def restoreSession(self, password, groups, csv):
        new_session = self.newSession(groups, password)

        conn = sqlite3.connect("data.db")
        cursor = conn.cursor()

        for peer_type, peer_id, peer_name, target, mark, comment in csv:
            self.newMarking(new_session, int(peer_type), str(peer_id), str(peer_name),
                            str(target), float(mark), str(comment))

        conn.commit()
        cursor.close()
        conn.close()
        
        return new_session