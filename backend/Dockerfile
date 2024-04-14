FROM ollama/ollama

RUN apt-get update && apt-get install -y curl unzip

# Install 'bun' and build dependencies
RUN curl -fsSL https://bun.sh/install | bash \
    && mv /root/.bun/bin/* /usr/local/bin/

# Add the 'bun' runtime to the PATH
ENV PATH="/usr/local/bin:${PATH}"

# Copy a custom entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

WORKDIR /usr/src/app


COPY package.json .
COPY bun.lockb .
RUN bun install --frozen-lockfile --production

COPY . .

EXPOSE 3000/tcp
EXPOSE 3333/tcp

VOLUME ["/root/.ollama"]

ENTRYPOINT ["/entrypoint.sh"]
CMD ["bun", "run", "index.ts", "--host", "0.0.0.0" ] 
