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
