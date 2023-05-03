from flask import Flask, request, render_template, jsonify, Response
from modules.database import connDB
import csv
from io import StringIO

PEERS_START = 'SETTING_PEERS_START\n'
PEERS_END = 'SETTING_PEERS_END\n'
CSV_START = 'SETTING_CSV_START\n'
CSV_END = 'SETTING_CSV_END\n'

db = connDB()
app = Flask(__name__)

@app.route("/", methods=['GET'])
def root():
    return render_template('index.html')

@app.route("/management", methods=['GET'])
def management():
    return render_template('management.html')

@app.route("/create-session", methods=['POST'])
def createSession():
    req = request.json
    session_id = db.newSession(
        req['peers'],
        req['password']
    )
    return jsonify({'session_id': session_id})

@app.route("/update-session", methods=['POST'])
def updateSession():
    req = request.json
    db.updateSession(
        req['session_id'],
        req['peers']
    )
    return jsonify({'updated': True})

@app.route('/check-session', methods=['POST'])
def checkSession():
    req = request.json
    return jsonify({'exist_session': db.sessionExists(req['session_id'])})

@app.route("/session-info", methods=['POST'])
def getSessionInfo():
    req = request.json
    session_info = db.getAllSessionInfo(
        req['session_id'],
        req['password']
    )
    return jsonify(session_info)

@app.route('/peer-mark-info', methods=['POST'])
def getPeerMarkInfo():
    req = request.json
    info = db.getPeerMarkInfo(
        req['session_id'],
        req['peer_id'],
        req['peer_name'],
        req['peer_type']
    )
    return jsonify(info)

@app.route("/update-marking", methods=['POST'])
def updateMarking():
    req = request.json
    db.updateMarking(
        req['session_id'],
        req['peer_type'],
        req['peer_id'],
        req['peer_name'],
        req['target'],
        req['mark'],
        req['comment']
    )
    return jsonify({'updated': True})

@app.route("/save/<type>", methods=['GET'])
def saveCSV(type):
    session_id = request.args.get('session_id')
    password = request.args.get('password')
    if not session_id:
        return jsonify("error", "args not enough!")
    session_info = db.getAllSessionInfo(
        session_id, password
    )
    csv_str = 'peer_type,peer_id,peer_name,target,mark,comment\n'
    for _,peer_type,peer_id,peer_name,target,mark,comment,_ in session_info['all_marks']:
        comment = comment.replace(',', '@@COMMA@@').replace("\n", '@@NEWLINE@@')
        csv_str += f'{peer_type},{peer_id},{peer_name},{target},{mark},{comment}\n'
    if type == 'setting':
        setting_str = PEERS_START
        for i in session_info['peers']:
            setting_str += i + ','
        setting_str = setting_str[0:-1] + f'\n{PEERS_END}{CSV_START}'
        setting_str += csv_str
        setting_str += CSV_END
        return Response(setting_str, mimetype="text/plain",headers={'Content-disposition': 'attachment; filename=session.txt'})
    return Response(
        csv_str, mimetype="text/csv",
        headers={'Content-disposition': 'attachment; filename=marks.csv'}
    )

@app.route("/restore-session", methods=['POST'])
def restoreSession():
    req = request.json
    setting_str = req['setting']
    password = req['password']
    
    peers = setting_str[
        setting_str.find(PEERS_START)+len(PEERS_START):
        setting_str.find(PEERS_END)
    ].replace('\n', '').split(',')

    csv_str = setting_str[
        setting_str.find(CSV_START)+len(CSV_START):
        setting_str.rfind(CSV_END)
    ]
    csv_file = StringIO(csv_str)
    csv_lines = list(csv.reader(csv_file, delimiter=','))
    for i in range(len(csv_lines)):
        csv_lines[i][-1] = csv_lines[i][-1].replace('@@COMMA@@', ',').replace("@@NEWLINE@@", '\n')

    session_id = db.restoreSession(password, peers, csv_lines[1:])
    return jsonify({'session_id': session_id})


if __name__ == '__main__':
    app.run(port=8000, debug=True, host='0.0.0.0')