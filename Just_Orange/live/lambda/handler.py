import json
import os
import hashlib
import time
import boto3
import urllib3
from urllib3.util.retry import Retry

MODEL = "gpt-4o-mini"
MAX_TOKENS = 150
CACHE_TTL = 86400
OPENAI_API_KEY = os.environ["OPENAI_API_KEY"]

print(f"Lambda started — Key len: {len(OPENAI_API_KEY)}")

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('JustOrangeCache')

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
}

http = urllib3.PoolManager(
    retries=Retry(total=3, backoff_factor=0.3, status_forcelist=[429, 500, 502, 503, 504]),
    timeout=urllib3.Timeout(connect=5.0, read=25.0)
)

def get_cache_key(payload: dict) -> str:
    key_str = f"{payload['ingredients'].lower()}|{payload.get('taste','mild').lower()}|{payload['prep']}|{payload['eat']}|{payload.get('allergens','').lower()}|{payload.get('exclusions','').lower()}"
    return hashlib.sha256(key_str.encode()).hexdigest()

def get_cached_recipe(cache_key: str):
    try:
        resp = table.get_item(Key={'hash': cache_key})
        item = resp.get('Item')
        if item and item.get('expires', 0) > int(time.time()):
            print("Cache HIT")
            return item['recipe']
    except Exception as e:
        print(f"Cache read error: {e}")
    return None

def cache_recipe(cache_key: str, recipe: str):
    try:
        table.put_item(Item={
            'hash': cache_key,
            'recipe': recipe,
            'expires': int(time.time()) + CACHE_TTL
        })
        print("Recipe cached")
    except Exception as e:
        print(f"Cache write error: {e}")

def generate_recipe(payload: dict) -> str:
    ingredients = payload['ingredients'].strip()
    taste = (payload.get('taste') or 'mild').strip() or 'mild'
    prep = int(payload['prep'])
    eat = int(payload['eat'])
    allergens = payload.get('allergens', '').strip()
    exclusions = payload.get('exclusions', '').strip()

    prompt = f"""Using only these exact ingredients: {ingredients}.
Create one very short {taste} recipe.
Prep ≤{prep}min, ready to eat ≤{eat}min.
Never add anything else.
{"Avoid allergens: " + allergens + "." if allergens else ""}
{"Never use: " + exclusions + "." if exclusions else ""}
Strict format only:
Ingredients (quantities):
- item (qty)
- item (qty)
Steps:
1. First step.
2. Second step.
3. Serve."""

    payload_json = {
        "model": MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": MAX_TOKENS,
        "temperature": 0.3
    }

    encoded_body = json.dumps(payload_json).encode('utf-8')

    print(f"Calling OpenAI... prompt len={len(prompt)}")

    response = http.request(
        'POST',
        'https://api.openai.com/v1/chat/completions',
        body=encoded_body,
        headers={
            'Authorization': f'Bearer {OPENAI_API_KEY}',
            'Content-Type': 'application/json'
        }
    )

    if response.status != 200:
        error_msg = response.data.decode('utf-8')
        raise Exception(f"OpenAI error {response.status}: {error_msg}")

    data = json.loads(response.data.decode('utf-8'))
    recipe = data['choices'][0]['message']['content'].strip()
    print(f"Success — recipe length: {len(recipe)}")
    return recipe

def lambda_handler(event, context):
    print("Request received")

    if event.get('httpMethod') == 'OPTIONS':
        return {"statusCode": 200, "headers": CORS_HEADERS, "body": ""}

    try:
        body = json.loads(event['body'])
        print(f"Payload: {body}")

        required = ["ingredients", "prep", "eat"]
        if not all(k in body for k in required):
            return {"statusCode": 400, "headers": CORS_HEADERS, "body": json.dumps({"error": "Missing fields"})}

        cache_key = get_cache_key(body)
        cached = get_cached_recipe(cache_key)
        if cached:
            return {"statusCode": 200, "headers": {**CORS_HEADERS, "Content-Type": "application/json"},
                    "body": json.dumps({"recipe": cached, "source": "cache"})}

        recipe = generate_recipe(body)
        cache_recipe(cache_key, recipe)

        return {"statusCode": 200, "headers": {**CORS_HEADERS, "Content-Type": "application/json"},
                "body": json.dumps({"recipe": recipe, "source": "openai"})}

    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"statusCode": 500, "headers": CORS_HEADERS,
                "body": json.dumps({"error": "Service unavailable — try again"})}