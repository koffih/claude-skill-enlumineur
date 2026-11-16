# Safety rules

**Demo account.** The config gives two shell commands, `compte.creer` and `compte.supprimer`, run
from the config's folder. `creer` makes a temporary account with the role to document and writes
its password to a file only the current user can read (`umask 077`). `supprimer` removes it and is
called even when the run fails. Use an address on the app's own domain that is not a mailbox, so
no email can reach a person.

**Blocked writes.** Every POST, PUT, PATCH and DELETE is answered 403 by the browser itself and never
reaches the server, except the regular expressions in `ecritures.autoriser`: the login endpoint and
read-only RPC functions you have checked in the code. Setting `ecritures.bloquer` to false is
refused unless `--autoriser-ecritures` is given, which is only for a disposable test copy.

**Dialogs** (confirm, alert) are dismissed, never accepted.

**Secrets.** The config never holds a key or a password: the account script reads the service key
from the server's own environment file. The password file and the config stay out of any
repository (`.gitignore` covers `*.pw`).

**Captures.** They show real data from the app. Keep them inside the app (its documentation
module) or on a private share. A public repository only ever holds captures of a demo with
fictitious data.

**One-time codes.** If the login sends a code by email, the blocked list shows it. Use the app's
test bypass for a verified device; never route codes to a real mailbox.
