"""Fixtures for OHomeMy's tests (pytest-homeassistant-custom-component)."""

from pathlib import Path

import pytest

from custom_components.ohomemy import bundles


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations):
    """Let Home Assistant load `custom_components/ohomemy`."""
    yield


@pytest.fixture
def frontend_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """An empty `frontend/`, standing in for the component's own."""
    monkeypatch.setattr(bundles, "FRONTEND_DIR", tmp_path)
    return tmp_path


@pytest.fixture
def built(frontend_dir: Path) -> Path:
    """`frontend/` with the Dashboard's and the Builder's bundles built in."""
    for element in ("ohomemy-dashboard", "ohomemy-builder"):
        bundle = frontend_dir / element
        bundle.mkdir()
        (bundle / f"{element}.js").write_text("import './chunk-abc.js';\n")
        (bundle / "chunk-abc.js").write_text("export {};\n")
    return frontend_dir
