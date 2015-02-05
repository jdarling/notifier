Notifier
===

Because there wasn't a simple stupid REST based notification handler already
available I spent a couple hours and built this.

API
---

###POST://api/v1/hipchat
Sends a message to the configured hipchat channel.
```
{
  event: 'name',
  data: {
    ...config...
  }
}
```

###POST://api/v1/notification
Sends a message to all available channels.  Currently just HipChat.
```
{
  event: 'name',
  data: {
    ...config...
  }
}
```

Planned API
---
```
{
  event: 'name',
  data: {
    ...config...
  }
}
```

###POST://api/v1/email


Sample Configuration
---

This belongs in a config.js (not json) file in the project root.

```
var config = {
  default: {
    web: {
      port: 3131
    },
    hipchat: {
      token: '<Your Token Here>',
      room: '<Your Room Here>',
      sender: 'Notifications',
      color: 'grey'
    },
    tails: [
      'better check your drawers',
      'there\'s a burr for your saddle',
      'sorry to dump salt in your kool-aid',
      'feel free to have a duck fit',
      'blame it on dingus',
      'that sticks in your throat like a hair in a biscuit',
      'gird your loins',
      'shoulda had a V8',
      'that\'s a problem only a motherboard could love',
      'did I do that',
    ],
    events: {
      default: {
          hipchat: '{{inspect this}}, {{tail}}'
        },
      message: {
          hipchat: '{{message}}, {{tail}}'
        },
      data: {
          hipchat: '{{inspect data}}, {{tail}}'
        },
      halt: {
          hipchat: {
            message: '{{config.env}} - {{error.message}}, {{tail}}',
            color: 'red'
          },
          email: {
            to: 'me@email.net',
            subject: '{{config.env}} - {{error.message}}',
            body: 'App: {{config.name}}\n\
Version: {{config.version}}\n\
Host: {{config.hostname}}\n\
Environment: {{config.env}}\n\
PID: {{config.pid}}\n\
\n\
ERROR: {{error.message}}\n\
\n\n\
STACK:\n\
{{error.stack}}'
          }
        },
    }
  },
  production: {
    web: {
      port: 80
    }
  }
};

module.exports = config;
```

Security
---

Nope, doesn't have any.  This isn't something you should put public.  Stick it
in your private network for your monitor tools to shove stuff to and let
it blast the info to all the channels you see fit.
