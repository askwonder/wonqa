FROM certbot/certbot
COPY . src/certbot-dns-dnsimple
RUN apk add --no-cache-dir git
RUN pip install git+https://github.com/aaronryden/certbot
COPY ./dnsimple.ini /opt/certbot
