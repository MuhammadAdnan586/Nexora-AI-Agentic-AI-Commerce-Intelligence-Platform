from slowapi import Limiter
from slowapi.util import get_remote_address

# Shared limiter instance. key_func=get_remote_address means limits are
# tracked per client IP. Imported by main.py (to register it with the app)
# and by any router that needs a tighter per-endpoint limit (e.g. agent.py).
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])
