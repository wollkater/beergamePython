from flask import Flask, render_template, request, redirect, jsonify, url_for, flash, make_response
from flask import session as user_session
from sqlalchemy import or_
from sqlalchemy.orm import sessionmaker

from db_init import Contract, Base, engine, GameSession, Company, Storage, SessionCompany

app = Flask(__name__)


#Connect to Database and create database session
Base.metadata.bind = engine
db_session = sessionmaker(bind=engine)
session = db_session()


@app.route('/sessions', methods=['GET', 'POST'])
def sessions():
    if request.method == 'POST':
        game_session = GameSession(name=request.form['name'])
        session.add(game_session)
        session.commit()

        user_session[game_session.id] = {"company": "GM"}

        return jsonify(game_seesion=game_session.serialize)
    else:
        games = session.query(GameSession).all()
        return jsonify(games=[g.serialize for g in games])


@app.route('/join', methods=['POST'])
def join():

    form = request.form
    game_session_id = form['game_session']

    if user_session[game_session_id] is None:
        game_session = session.query(GameSession).filter_by(id = game_session_id).one()
        company = Company(type=form['type'])
        user_session[game_session.id] = {"company": company.type.name, "company_id": company.id}
        return jsonify(company=company.serialize)
    else:
        company = session.query(SessionCompany).filter_by(session_id=game_session_id).one().company
        return jsonify(company=company.serialize)


@app.route('/<int:session_id>/contracts', methods=['GET', 'POST'])
def contracts(session_id):
    if request.method == 'POST':
        contract = Contract(seller_id=request.form['seller_id'],
                            purchaser_id=request.form['purchaser_id'],
                            resource=request.form['resource'],
                            amount=request.form['amount'],
                            fulfilled=False)
        session.add(contract)
        session.commit()

        return jsonify(contract=contract.serialize)
    else:
        c_id = user_session.get(session_id).get('company_id')
        contracts = session.query(Contract).filter(or_(Contract.purchaser == c_id, Contract.seller == c_id))
        return jsonify(contracts=[c.serialize for c in contracts])

if __name__ == '__main__':
    app.secret_key = 'super_secret_key'
    app.debug = True
    app.run(host='0.0.0.0', port=5000)
