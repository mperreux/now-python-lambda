# now-python-lambda

A [now builder](https://zeit.co/docs/v2/deployments/builders/overview/]) for creating python lambda functions.

## Example usage

`now.json`

```json
{
  "version": 2,
  "name": "now-python-lambda-example",
  "builds": [
    {
      "src": "backend/config.json",
      "use": "now-python-lambda"
    }
  ]
}
```

`backend/config.json`

```JSON
{
  "functions": {
    "hello_world": {
      "entrypoint": "api/hello_world",
      "handler": "hello_world.handler"
    }
  }
}
```

`backend/hello_world.py`

```python
import json

def handler(event, context):
    return {
        'statusCode': 200,
        'headers': {
            'content-type': 'application/json'
        },
        'body': json.dumps({
          'data': 'hello world'
        })
    }

```
