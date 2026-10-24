# Security policy

## Reporting a vulnerability

Please do **not** report a security problem in a public issue, pull request or
forum post.

Report it privately through GitHub instead: open the **Security** tab of this
repository, then **Report a vulnerability**.

No such button? Private reporting is not enabled yet: open an issue that only
asks the maintainers for a private contact, without any detail of the problem,
and send the report there.

Include, when you can:

- the version of the integration and of Gladys;
- what an attacker can do, and the steps to reproduce it;
- the log lines that help (remove tokens, passwords and addresses first).

The fix ships as a new version of the integration, and the advisory is
published once users can update.

## Supported versions

Only the latest release receives security fixes: update the integration from
Gladys before reporting a problem.

## Scope

In scope: the code of this repository and the Docker image it publishes.

What the integration handles:

- **No secret.** The Frank Energie price API is public: no account, no key, no
  password in the configuration (the customer login of Frank Energie is not
  used). The only credential in the container is the integration token Gladys
  gives it, never logged.
- **`/data`** holds one file, `scene-events.json`: the start of the last hour
  whose scene events were sent. Nothing personal.
- **Network**: outbound HTTPS to `graphql.frankenergie.nl` only, about two
  requests an hour. Nothing listens on the network; the container talks to
  Gladys through the SDK.

Out of scope: Gladys Assistant itself (see its
[security policy](https://github.com/GladysAssistant/Gladys/security/policy)),
and the Frank Energie service.
