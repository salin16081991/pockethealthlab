# SPHL Core web app — self-hosted container
# Build:  docker build -t sphl-web -f docker/Dockerfile .
# Run:    docker run -p 8080:80 sphl-web
FROM nginx:1.27-alpine

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY prototypes/sphl-core-web/ /usr/share/nginx/html/

# Container healthcheck for orchestrators
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
