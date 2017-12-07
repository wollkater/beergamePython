from sqlalchemy import Column, ForeignKey, Integer, Enum, Text, Boolean
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()

class Storage(Base):
    __tablename__ = 'storage'

    id = Column(Integer, primary_key=True)
    resource = Column('resource', Enum("Water", "Hop", "Beer", name="resource_type"))
    amount = Column(Integer)
    company_id = Column(Integer, ForeignKey('company.id'))

    @property
    def serialize(self):
        """Return object data in easily serializeable format"""
        return {
            'id': self.id,
            'resource': self.resource,
            'amount': self.amount,
        }

class Company(Base):
    __tablename__ = 'company'

    id = Column(Integer, primary_key=True)
    name = Column(Text, nullable=False)
    type = Column('type', Enum("Brewery", "Store", "Wholesaler", "GM", name='company_type'))
    costs = Column(Integer)
    storages = relationship(Storage)



    @property
    def serialize(self):
        """Return object data in easily serializeable format"""
        return {
            'name': self.name,
            'id': self.id,
            'costs': self.costs,
            'type': self.type
        }




class GameSession(Base):
    __tablename__ = 'game_session'

    id = Column(Integer, primary_key=True)
    name = Column(Text)
    current_round = Column(Integer)

    @property
    def serialize(self):
        """Return object data in easily serializeable format"""
        return {
            'id': self.id,
            'name': self.name
        }


class SessionCompany(Base):
    __tablename__ = 'game_session_company'

    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey('game_session.id'))
    session = relationship(GameSession)
    company_id = Column(Integer, ForeignKey('company.id'))
    company = relationship(Company)
    ready = Column(Boolean)

    @property
    def serialize(self):
        """Return object data in easily serializeable format"""
        return {
            'id': self.id,
            'session': self.session.serialize,
            'company': self.company.serialize,
            'isReady': self.ready
        }


class Contract(Base):
    __tablename__ = 'contract'
    id = Column(Integer, primary_key=True)
    purchaser_id = Column(Integer, ForeignKey('company.id'))
    purchaser = relationship(Company, foreign_keys=[purchaser_id])
    seller_id = Column(Integer, ForeignKey('company.id'))
    seller = relationship(Company, foreign_keys=[seller_id])
    resource = Column('resource', Enum("Water", "Hop", "Beer", name='resource_type'))
    amount = Column(Integer)
    fulfilled = Column(Boolean)
    round_created = Column(Integer)


    @property
    def serialize(self):
        """Return object data in easily serializeable format"""
        return {
            'id': self.id,
            'purchaser': self.purchaser_id,
            'seller': self.seller_id,
            'resource': self.resource,
            'amount': self.amount,
        }


engine = create_engine('sqlite:///beergame.db')

Base.metadata.create_all(engine)
