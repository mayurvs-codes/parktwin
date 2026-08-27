"""
ParkTwin AI — Engine
====================
Coordinates the complete AI pipeline end-to-end. The engine wires the
``modules`` business capabilities together and is the only place that imports
across module boundaries for inference.

Modules depend on the engine; the engine does not depend on any business
module's internals beyond their public classes.
"""
