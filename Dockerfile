FROM python:3.6

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY requirements.txt /usr/src/app/
RUN pip install --no-cache-dir -r requirements.txt

COPY Beergame.py /usr/src/app
COPY db_init.py /usr/src/app
RUN python db_init.py
RUN python Beergame.py