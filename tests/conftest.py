import sys
from pathlib import Path

# Ensure repo root is on sys.path so src.* imports resolve correctly
sys.path.insert(0, str(Path(__file__).parent.parent))
