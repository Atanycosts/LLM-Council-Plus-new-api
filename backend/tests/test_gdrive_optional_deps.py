"""Regression tests: backend should import without Google Drive deps installed."""

from __future__ import annotations

import builtins
import importlib


def test_gdrive_module_imports_without_google_deps(monkeypatch):
    """
    The Google Drive feature is optional. If googleapiclient/google-auth are not installed,
    importing backend.gdrive should still succeed, and status endpoint helpers should work.
    """
    original_import = builtins.__import__

    def guarded_import(name, globals=None, locals=None, fromlist=(), level=0):
        if name.startswith("googleapiclient") or name.startswith("google.oauth2"):
            raise ImportError("blocked for test")
        return original_import(name, globals, locals, fromlist, level)

    monkeypatch.setattr(builtins, "__import__", guarded_import)

    import backend.gdrive as gdrive

    importlib.reload(gdrive)

    status = gdrive.get_drive_status()
    assert "enabled" in status
    assert "configured" in status

