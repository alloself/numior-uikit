FROM debian:trixie-slim
RUN apt-get update \
  && apt-get install -y --no-install-recommends libreoffice-calc-nogui \
  && rm -rf /var/lib/apt/lists/*
COPY registrymodifications.xcu /opt/profile/user/registrymodifications.xcu
