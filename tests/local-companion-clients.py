"""Local-only multiplayer QA clients; never connects to the public service."""
import json
import math
import time
import urllib.request
import uuid

clients = [{"id":str(uuid.uuid4()),"token":str(uuid.uuid4()),"session":str(uuid.uuid4())} for _ in range(2)]

def call(client, route, **fields):
    body={"id":client["id"],"session":client["session"],**fields}
    request=urllib.request.Request("http://127.0.0.1:8787/dao/"+route,
        data=json.dumps(body).encode(),headers={"Content-Type":"application/json",
        "Origin":"http://127.0.0.1:4175","Authorization":"Bearer "+client["token"]})
    with urllib.request.urlopen(request,timeout=5) as response:
        return json.load(response)

try:
    started=time.monotonic()
    print("Two local QA clients running; one walks, one remains still. No public messages or production data.",flush=True)
    while time.monotonic()-started<600:
        elapsed=time.monotonic()-started
        call(clients[0],"presence",name="联调·松风",x=math.sin(elapsed/3)*3,z=7,area="temple")
        call(clients[1],"presence",name="联调·听雨",x=-4,z=5.5,area="temple")
        time.sleep(.8)
finally:
    for client in clients:
        try:call(client,"leave")
        except Exception:pass
