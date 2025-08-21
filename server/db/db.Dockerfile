FROM postgres:16

ENV LANG=en_US.utf8
ENV TZ=Etc/UTC

# Create directory for initialization files
RUN mkdir -p /init

# Copy initialization files
COPY init/ /init/

# Copy and set up the initialization script
COPY scripts/init-db.sh /docker-entrypoint-initdb.d/
RUN chmod +x /docker-entrypoint-initdb.d/init-db.sh

ENV POSTGRES_DB=postgres
ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=postgres

EXPOSE 5432
