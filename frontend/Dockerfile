FROM oven/bun:1.1.3
WORKDIR /usr/src/app

COPY package.json   .
COPY bun.lockb      .
RUN bun install --frozen-lockfile

COPY .              .

EXPOSE 5173/tcp
ENTRYPOINT [ "bun" ]
CMD [ "run", "dev",  "--", "--host", "0.0.0.0", "--port", "5173" ]