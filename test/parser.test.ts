import { describe, expect, it } from 'vitest';
import { parseCommand } from '../src/commands/parser.js';

describe('parseCommand', () => {
  it('splits a Swedish question command and its text', () => {
    expect(parseCommand('!fråga Vad är huvudstaden i Sverige?', '!')).toEqual({
      name: 'fråga',
      args: 'Vad är huvudstaden i Sverige?',
    });
  });

  it('lowercases the name with Swedish rules and trims whitespace', () => {
    expect(parseCommand('   !FRÅGA   hej   ', '!')).toEqual({
      name: 'fråga',
      args: 'hej',
    });
  });

  it('accepts a command with no arguments', () => {
    expect(parseCommand('!hjälp', '!')).toEqual({ name: 'hjälp', args: '' });
  });

  it('returns null when the prefix is missing or the name is empty', () => {
    expect(parseCommand('vanlig kommentar', '!')).toBeNull();
    expect(parseCommand('!', '!')).toBeNull();
    expect(parseCommand('!   ', '!')).toBeNull();
  });

  it('rejects names that are not a single token of letters or numbers', () => {
    expect(parseCommand('!!fråga', '!')).toBeNull();
    expect(parseCommand('!fråga!', '!')).toBeNull();
  });

  it('honours a custom prefix', () => {
    expect(parseCommand('#ask what time is it?', '#')).toEqual({
      name: 'ask',
      args: 'what time is it?',
    });
  });
});
