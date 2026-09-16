# Kimai

## Documentation

- [Kimai documentation](https://www.kimai.org/documentation/) — the upstream user and administration guide, including getting started, invoices and the REST API.

## What you get on StartOS

Kimai and its database run together as one service. The Web Interface serves both Kimai's UI and its REST API, the `admin` account is created for you, and Kimai's outgoing email can be routed through your StartOS SMTP settings or a provider of your own. Timesheets, invoices, exports and custom templates are all included in StartOS backups.

## Getting set up

1. Run the **Set Admin Password** action. Kimai starts with no accounts, so StartOS asks you to do this first. Copy the username and password it returns — the password is shown only once.
2. Start Kimai. The first start builds the database and can take several minutes; the Web Interface check reads as starting until it finishes.
3. Open the **Web Interface** and sign in as `admin` with the password from step 1. Kimai offers a short setup wizard; you can step through it or skip it.
4. In Kimai, open your user profile and set a real email address. The account is created with a placeholder address, so password-reset emails for it would go nowhere.
5. Create a customer, then a project under it, then an activity. Kimai needs all three before you can record time.

## Using Kimai

### Web interface

The dashboard timer records time against a project and activity. Timesheets, customers, projects, invoices, exports, reporting and user administration are in the sidebar. The same address serves the REST API under `/api`; create an API token from your user profile.

### Actions

- **Set Admin Password** — generates a fresh password for `admin` and shows it once. Use it if you lose the password or want to rotate it. Kimai restarts to apply the change. The password of `admin` is managed here, not inside Kimai: a change made in Kimai's own profile page reverts the next time the service starts. Other users' passwords are managed inside Kimai.
- **Configure SMTP** — lets Kimai send password resets, invoices and scheduled reports through your StartOS system SMTP settings or a custom provider. Until you do, the Email health check reads as disabled and those features do nothing.
