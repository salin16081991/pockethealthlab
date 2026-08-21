# SPHL Docker Deployment

Self-hosted deployment of the SPHL Core web app — an alternative to GitHub
Pages for servers, clinics, offline networks, or your own infrastructure.
Same app, same single source of truth (`prototypes/sphl-core-web/`).

## Requirements

- Docker (on this Mac: install **Docker Desktop for Mac — Apple Silicon**
  from https://www.docker.com/products/docker-desktop/)

## Run locally

From the repository root:

```bash
docker compose -f docker/docker-compose.yml up --build
```

Then open http://localhost:8080.

> Note: the **camera only works over HTTPS or on localhost** — so
> http://localhost:8080 works on this machine, but other devices on your
> network need the HTTPS setup below (or use https://pockethealthlab.sirony.in).

## Self-host with HTTPS on a server

1. Point a DNS A record (e.g. `lab.sirony.in`) at your server's IP.
2. Uncomment the `caddy` service in `docker-compose.yml` and set your domain.
3. `docker compose -f docker/docker-compose.yml up -d`

Caddy obtains and renews the TLS certificate automatically.

## Build the image alone

```bash
docker build -t sphl-web -f docker/Dockerfile .
docker run -p 8080:80 sphl-web
```
