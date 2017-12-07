from flask import Flask, request, jsonify
from flask import session as user_session
from flask_cors import CORS
from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm.exc import NoResultFound

from db_init import Contract, Base, engine, GameSession, Company, Storage, SessionCompany

app = Flask(__name__)
CORS(app, supports_credentials=True)

# Connect to Database and create database session
Base.metadata.bind = engine
db_session = sessionmaker(bind=engine)
session = db_session()
companies = ("Store", "Wholesaler", "Brewery", "GM")


@app.route('/sessions', methods=['GET', 'POST'])
def sessions():
    if request.method == 'POST':
        game_session = GameSession(name=request.json['name'])
        company = Company(type="GM", costs=0, name="GameMaster")
        session.add(company)
        session.commit()

        session.add(game_session)
        session.commit()

        storage = Storage(company_id=company.id, resource='Hop', amount=50000000000)
        session.add(storage)
        session.commit()

        company_session = SessionCompany(session_id=game_session.id, company_id=company.id)
        session.add(company_session)
        session.commit()

        user_session[str(game_session.id)] = {"company": "GM", "company_id": company.id}
        user_session.permanent = True
        return jsonify(game_session=company_session.serialize)
    else:
        games = session.query(GameSession).all()
        return jsonify(games=[g.serialize for g in games])
@app.route('/sessions/<int:session_id>')
def sessionDetail(session_id):
    return jsonify(session.query(GameSession).filter(GameSession.id == session_id).one().serialize)

@app.route('/<int:session_id>/join', methods=['POST', 'GET'])
def join(session_id):
    form = request.json

    if str(session_id) not in user_session:
        game_session = session.query(GameSession).filter_by(id=session_id).one()
        company = Company(type=form['type'], costs=0, name='')
        session.add(company)
        session.commit()
        session_company = SessionCompany(session_id=session_id, company_id=company.id)
        session.add(session_company)
        session.commit()

        user_session[str(game_session.id)] = {"company": company.type, "company_id": company.id}
    else:
        company = session.query(SessionCompany).filter_by(session_id=session_id).filter_by(company_id=user_session[str(session_id)]["company_id"]).one().company
    return jsonify(company=company.serialize)


@app.route('/<int:session_id>/availableCompanies')
def availableCompanies(session_id):

    companies_in_use = session.query(SessionCompany).filter_by(session_id=session_id).all()
    companies_in_use = [c.company.type for c in companies_in_use]
    usable = [company for company in companies if company not in companies_in_use]

    return jsonify(companies=usable)


@app.route('/<int:session_id>/contracts', methods=['GET', 'POST'])
def contracts(session_id):
    if request.method == 'POST':
        resource = ''
        seller = ''
        c_type = user_session[str(session_id)]['company'];

        if c_type == 'Brewery':
            resource = 'HOP'
            seller = 'GM'
        elif c_type == 'Wholesaler':
            resource = 'Beer'
            seller = 'Brewery'
        elif c_type == 'Store':
            resource = 'Beer'
            seller = 'Wholesaler'
        elif c_type == 'GM':
            resource = 'Beer'
            seller = 'Store'

        query = session.query(SessionCompany)
        query = query.filter(SessionCompany.session_id==session_id)
        query = query.join(SessionCompany.company).filter(Company.type==seller)
        seller = query.one()

        contract = Contract(seller_id=seller.id,
                            purchaser_id=user_session[str(session_id)]['company'],
                            resource=resource,
                            amount=request.json['amount'],
                            fulfilled=False)
        session.add(contract)
        session.commit()

        return jsonify(contract=contract.serialize)
    else:
        if str(session_id) in user_session:
            c_id = user_session.get(str(session_id)).get('company_id')
            bought = session.query(Contract).filter(Contract.purchaser == c_id)
            sold = session.query(Contract).filter(Contract.seller == c_id)
            return jsonify(bought=[b.serialize for b in bought],
                           sold=[s.serialize for s in sold])

        else:
            print(user_session)
            return {}


@app.route('/<int:session_id>/round/next', methods=['GET'])
def nextRound(session_id):
    if str(session_id) in user_session and user_session.get(str(session_id)).get("company") == "GM":
        game_session = session.query(GameSession).filter_by(id=session_id).one()
        game_session.current_round = game_session.current_round + 1
        session.add(game_session)
        session.commit()

        companies = [c.company for c in session.query(SessionCompany).filter_by(session_id=session_id).all()]

        for company in companies:
            query = session.query(Contract).filter(Contract.seller_id == company.id)
            query = query.filter(Contract.fulfilled is False)
            query = query.filter(Contract.round_created >= game_session.current_round + 2)
            contracts = query.all()

            for contract in contracts:
                query = session.query(Storage).filter(Storage.type == contract.resource)
                try:
                    resource_seller = query.filter(Storage.company_id == contract.seller_id).one()
                except NoResultFound:
                    resource_seller = None
                try:
                    resource_buyer = query.filter(Storage.company_id == contract.purchaser_id).one()
                except NoResultFound:
                    resource_buyer = Storage(resource=contract.resource, amount=0, company_id=contract.purchaser_id)
                    # Can't fulfill the contract, calculate punishment costs
                if resource_seller is None or resource_seller.amount < contract.amount:
                    company.costs += (10 * contract.amount)
                    session.add(company)
                    session.commit()
                else:
                    resource_seller.amount -= contract.amount
                    contract.fulfilled = True
                    session.add(contract)
                    session.add(resource_seller)
                    resource_buyer.amount += contract.amount
                    session.add(resource_buyer)
                    session.commit()

                # Brew beer
                if company.type.name == 'Brewery':
                    hop = session.query(Storage).filter(Storage.company_id == company.id).filter(
                        Storage.resource.type == 'HOP').one()
                    beer = session.query(Storage).filter(Storage.company_id == company.id).filter(
                        Storage.resource.type == 'BEER').one()

                    beer.amount += hop.amount
                    hop.amount = 0
                    session.add(beer)
                    session.add(hop)
                    session.commit()

                # Calculate storage costs
                costs = 0
                for storage in company.storages:
                    costs += storage.amount*5
                company.costs += costs
                session.add(company)
                session.commit()

@app.route('/<int:session_id>/ready', methods=['GET', 'POST'])
def ready(session_id):
    if request.method == 'POST':
        c_id = request.json['company_id']
        isReady = request.json['ready']
        session_company = session.query(SessionCompany).filter(SessionCompany.company_id == c_id).one()
        session_company.ready = isReady
        session.add(session_company)
        session.commit()
        return jsonify(session_company=session_company.serialize)
    else:
        session_companyies = session.query(SessionCompany).filter(SessionCompany.session_id  == session_id).all()
        return jsonify(session_companies=[s_c.serialize for s_c in session_companyies])

if __name__ == '__main__':
    app.secret_key = 'super_secret_key'
    app.debug = True
    app.run(host='0.0.0.0', port=5000)
