FROM certbot/certbot
COPY . src/certbot-dns-dnsimple
RUN apk add --no-cache-dir git
RUN pip install git+https://github.com/askwonder/certbot-dns-dnsimple
COPY ./dnsimple.ini /opt/certbot
