import test from 'node:test';
import assert from 'node:assert/strict';
import { isGoogleSite } from '../src/shared/google-site.js';

test('Google services and their subdomains are unsupported', () => {
  for (const input of ['google.com', 'gmail.com', 'https://mail.google.com/mail/u/0/',
    'accounts.google.com', 'drive.google.com', 'www.youtube.com', 'music.youtube.com',
    'youtu.be', 'google.co.uk', 'google.com.sg', 'about.google', 'https://blog.google/',
    'sub.about.google']) assert.equal(isGoogleSite(input), true, input);
});

test('other websites and incomplete input do not trigger the Google notice', () => {
  for (const input of ['', 'google', 'example.com', 'notgoogle.com',
    'google.com.example.org', 'about.google.example.org', 'notgoogle.org',
    'https://example.com/google.com']) assert.equal(isGoogleSite(input), false, input);
});
