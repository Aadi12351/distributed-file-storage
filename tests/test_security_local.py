import base64
import io
import time
import pytest
from app.models.security import AccountSecurity, LoginSession
from app.services.security_service import totp, reveal
from app.config.settings import settings
from tests.test_drive_local import local_client, account


def login(c, email, otp=""):
    return c.post('/auth/login', data={"username": email, "password": "strong-test-pass", "otp": otp})


def bearer(response):
    assert response.status_code == 200, response.text
    return {"Authorization": "Bearer " + response.json()["access_token"]}


def test_authenticator_enrollment_recovery_and_replay(local_client, monkeypatch):
    c = local_client
    headers = account(c, "mfa@example.com")
    old = headers.copy()
    assert c.post('/security/2fa/setup', headers=headers, json={"password": "wrong"}).status_code == 400
    setup = c.post('/security/2fa/setup', headers=headers, json={"password": "strong-test-pass"})
    assert setup.status_code == 200
    secret = setup.json()["secret"]
    assert "otpauth://totp/" in setup.json()["uri"]
    assert c.post('/security/2fa/enable', headers=headers, json={"code": "abcdef"}).status_code == 400
    code = totp(secret, int(time.time() // 30))
    enabled = c.post('/security/2fa/enable', headers=headers, json={"code": code})
    headers = bearer(enabled)
    recovery = enabled.json()["recovery_codes"]
    assert len(recovery) == 8
    assert c.get('/me', headers=old).status_code == 401
    assert login(c, 'mfa@example.com').status_code == 401
    assert login(c, 'mfa@example.com', 'wrong').status_code == 401
    assert login(c, 'mfa@example.com', code).status_code == 401
    clock = time.time() + 31
    monkeypatch.setattr(time, 'time', lambda: clock)
    code = totp(secret, int(clock // 30))
    signed_in = bearer(login(c, 'mfa@example.com', code))
    assert login(c, 'mfa@example.com', code).status_code == 401
    recovered = bearer(login(c, 'mfa@example.com', recovery[0]))
    assert login(c, 'mfa@example.com', recovery[0]).status_code == 401
    overview = c.get('/security', headers=recovered).json()
    assert overview['two_factor_enabled'] and overview['recovery_codes_remaining'] == 7
    assert any(e['event'] == 'Two-step verification enabled' for e in overview['events'])
    assert c.post('/account/password', headers=recovered, json={"current_password": "strong-test-pass", "new_password": "another-strong-password"}).status_code == 400
    regenerated = c.post('/security/2fa/recovery', headers=recovered, json={"password": "strong-test-pass", "code": recovery[1]})
    recovered = bearer(regenerated)
    assert login(c, 'mfa@example.com', recovery[2]).status_code == 401
    recovery = regenerated.json()['recovery_codes']
    assert len(recovery) == 8
    disabled = c.post('/security/2fa/disable', headers=recovered, json={"password": "strong-test-pass", "code": recovery[1]})
    after = bearer(disabled)
    assert not c.get('/security', headers=after).json()['two_factor_enabled']
    assert c.get('/me', headers=signed_in).status_code == 401
    assert login(c, 'mfa@example.com').status_code == 200


def test_session_revocation_also_revokes_preview(local_client):
    c = local_client
    first = account(c, 'sessions@example.com')
    second = bearer(login(c, 'sessions@example.com'))
    outsider = account(c, 'unrelated@example.com')
    fid = c.post('/files/upload', headers=first, files={"file": ('private.txt', io.BytesIO(b'private'), 'text/plain')}).json()['id']
    preview = c.get(f'/preview/{fid}/info', headers=first).json()['token']
    sessions = c.get('/security', headers=first).json()['sessions']
    current = next(s for s in sessions if s['current'])
    assert c.delete(f'/security/sessions/{current["id"]}', headers=outsider).status_code == 404
    assert c.delete(f'/security/sessions/{current["id"]}', headers=first).status_code == 400
    assert c.delete(f'/security/sessions/{current["id"]}', headers=second).status_code == 200
    assert c.get('/me', headers=first).status_code == 401
    assert c.get(f'/preview/{fid}/content?token={preview}').status_code == 401
    assert c.get('/me', headers=second).status_code == 200
    third = bearer(login(c, 'sessions@example.com'))
    rotated = bearer(c.post('/security/sessions/revoke-others', headers=second, json={"password": "strong-test-pass"}))
    assert c.get('/me', headers=second).status_code == 401
    assert c.get('/me', headers=third).status_code == 401
    assert c.get('/me', headers=rotated).status_code == 200
    assert c.post('/security/logout', headers=rotated).status_code == 200
    assert c.get('/me', headers=rotated).status_code == 401


def test_throttling_and_upload_limits(local_client, monkeypatch):
    c = local_client
    headers = account(c, 'limits@example.com')
    for _ in range(5):
        assert c.post('/auth/login', data={"username": "limits@example.com", "password": "bad"}).status_code == 401
    limited = login(c, 'limits@example.com')
    assert limited.status_code == 429 and int(limited.headers['retry-after']) > 0
    assert len(c.get('/security', headers=headers).json()['events']) >= 6
    monkeypatch.setattr(settings, 'MAX_UPLOAD_MB', 1)
    oversized = c.post('/files/upload', headers=headers, files={"file": ('big.bin', b'0' * (1024 * 1024 + 1), 'application/octet-stream')})
    assert oversized.status_code == 413
    assert c.get('/files', headers=headers).json() == []
    fid = c.post('/files/upload', headers=headers, files={"file": ('keep.txt', b'original', 'text/plain')}).json()['id']
    assert c.put(f'/files/{fid}/replace', headers=headers, files={"file": ('big.bin', b'0' * (1024 * 1024 + 1), 'application/octet-stream')}).status_code == 413
    assert c.get(f'/files/{fid}/download', headers=headers).content == b'original'
    assert c.get('/me', headers=headers).headers['cache-control'] == 'private, no-store'
    def chunks():
        yield b'{"subject":"big","description":"'
        for _ in range(7): yield b'x' * 10000
        yield b'"}'
    streamed = c.post('/support', headers={**headers, 'Content-Type': 'application/json'}, content=chunks())
    assert streamed.status_code == 413


def test_totp_matches_rfc6238_sha1_vector():
    secret = base64.b32encode(b'12345678901234567890').decode().rstrip('=')
    assert totp(secret, 59 // 30) == '287082'
