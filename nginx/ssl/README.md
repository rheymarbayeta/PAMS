# Place your SSL certificates here
# For production, you'll need:
# - fullchain.pem (or cert.pem)
# - privkey.pem (or key.pem)

# You can obtain free SSL certificates from Let's Encrypt:
# https://letsencrypt.org/

# For testing, you can generate self-signed certificates:
# openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
#   -keyout privkey.pem -out fullchain.pem \
#   -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
