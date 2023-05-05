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
                       'target text, target_group text, mark numeric, comment text, timestamp numeric, '+
                       'unique(session_id, peer_type, peer_id, peer_name, target, target_group));')
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

        session_info = {}
        certification = cursor.execute('select * from sessions where id=? and password=?;', (session_id, password)).fetchone()
        if not certification:
            session_info['failed'] = True
        else:
            session_info['current_group'] = certification[-1]
            groups = cursor.execute('select name, peers from groups where session_id=?;', (session_id,)).fetchall()
            session_info['groups'] = [{'name': name, 'peers': peers.split(',')} for name, peers in groups]

            session_info['all_marks'] = cursor.execute(
                'select * from marks where session_id=?;', (session_id,)
            ).fetchall()
        
        cursor.close()
        conn.close()
        return session_info

    def updateSession(self, session_id, groups, update_group_name, update_peer_name):
        conn = sqlite3.connect("data.db")
        cursor = conn.cursor()

        if update_group_name:
            cursor.execute('update groups set name=? where session_id=? and name=?;', (
                update_group_name[1], session_id, update_group_name[0]
            ))
            cursor.execute('update marks set target_group=? where session_id=? and target_group=?;', (
                update_group_name[1], session_id, update_group_name[0]
            ))
        if update_peer_name:
            cursor.execute('update marks set target=? where session_id=? and target=?;', (
                update_peer_name[1], session_id, update_peer_name[0]
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

    def updateCurrentGroup(self, session_id, current_group):
        conn = sqlite3.connect("data.db")
        cursor = conn.cursor()

        cursor.execute("update sessions set current_group=? where id=?", (current_group, session_id))

        conn.commit()
        cursor.close()
        conn.close()

    def getPeerMarkInfo(self, session_id, peer_id, peer_name, peer_type):
        conn = sqlite3.connect("data.db")
        cursor = conn.cursor()

        current_group = cursor.execute('select current_group from sessions where id=?', (session_id,)).fetchone()[0]
        info = {}
        mark_sql = (
            "select * from marks where session_id=? and"+
            " peer_id=? and peer_name=? and peer_type=?;"
        )
        mark_params = [session_id, peer_id, peer_name, peer_type]

        groups_sql = "select name, peers from groups where session_id=?;"
        groups_params = [session_id]

        if current_group:
            mark_sql = mark_sql[:-1] + " and target_group=?;"
            mark_params.append(current_group)

            groups_sql = groups_sql[:-1]+" and name=?;"
            groups_params.append(current_group)

        info['marks'] = cursor.execute(mark_sql, tuple(mark_params)).fetchall()
        groups = cursor.execute(groups_sql, tuple(groups_params)).fetchall()
        
        info['groups'] = []
        for i in groups:
            info['groups'].append({'name': i[0], 'peers': i[1].split(',')})
        
        cursor.close()
        conn.close()
        return info
    
    def updateMarking(self, session_id, peer_type, peer_id, peer_name, target_group, updates):
        conn = sqlite3.connect("data.db")
        cursor = conn.cursor()

        for i in updates:
            cursor.execute("update marks set mark=?, comment=?, timestamp=? where "+
                           "session_id=? and peer_id=? and peer_name=? and peer_type=? "+
                           "and target=? and target_group=?;",
                           (i['mark'], i['comment'], time(), session_id, peer_id, peer_name, peer_type, i['peer'], target_group))
            cursor.execute("insert or ignore into marks values (?,?,?,?,?,?,?,?,?);", 
                           (session_id, peer_type, peer_id, peer_name, i['peer'], target_group, i['mark'], i['comment'], time()))
        conn.commit()
        cursor.close()
        conn.close()
    
    def restoreSession(self, password, groups, csv):
        new_session = self.newSession(groups, password)

        conn = sqlite3.connect("data.db")
        cursor = conn.cursor()

        for peer_type, peer_id, peer_name, target, target_group, mark, comment in csv:
            cursor.execute("insert or ignore into marks values (?,?,?,?,?,?,?,?,?);",
                (new_session, int(peer_type), str(peer_id), str(peer_name),
                str(target), str(target_group), float(mark), str(comment), time()))

        conn.commit()
        cursor.close()
        conn.close()
        
        return new_session