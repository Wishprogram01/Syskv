import { describe, expect, test } from 'bun:test';
import { renderMarkdown, getWordCount, highlightText } from '../src/utils/markdown';
import { esc, stripMd, parseTags, fromLocalInput } from '../src/utils/helpers';

describe('renderMarkdown', () => {
  test('renders headings', () => {
    expect(renderMarkdown('# Title')).toBe('<h1>Title</h1>');
    expect(renderMarkdown('## Sub')).toBe('<h2>Sub</h2>');
    expect(renderMarkdown('###### Deep')).toBe('<h6>Deep</h6>');
  });

  test('renders bold, italic and strike', () => {
    expect(renderMarkdown('**bold**')).toBe('<p><strong>bold</strong></p>');
    expect(renderMarkdown('*italic*')).toBe('<p><em>italic</em></p>');
    expect(renderMarkdown('~~gone~~')).toBe('<p><del>gone</del></p>');
  });

  test('renders inline code and code blocks', () => {
    expect(renderMarkdown('use `code` here')).toContain('<code>code</code>');
    expect(renderMarkdown('```js\nconst x = 1;\n```')).toContain('<pre><code>');
  });

  test('renders links', () => {
    expect(renderMarkdown('[openai](https://openai.com)')).toContain(
      '<a href="https://openai.com" target="_blank" rel="noopener">openai</a>'
    );
  });

  test('renders unordered and ordered lists', () => {
    expect(renderMarkdown('- one\n- two')).toBe('<ul>\n<li>one</li>\n<li>two</li>\n</ul>');
    expect(renderMarkdown('1. one\n2. two')).toBe('<ol>\n<li>one</li>\n<li>two</li>\n</ol>');
  });

  test('renders blockquote', () => {
    expect(renderMarkdown('> quote')).toBe('<blockquote>quote</blockquote>');
  });

  test('renders horizontal rule', () => {
    expect(renderMarkdown('---')).toBe('<hr>');
  });

  test('renders table', () => {
    const md = '| A | B |\n|---|---|\n| 1 | 2 |';
    const html = renderMarkdown(md);
    expect(html).toContain('<table>');
    expect(html).toContain('<th>A</th>');
    expect(html).toContain('<td>1</td>');
  });

  test('backlink to an existing note becomes a link', () => {
    const notes = [{ title: 'Roadmap', id: 'abc123', trashed: false }];
    expect(renderMarkdown('See [[Roadmap]]', notes)).toContain(
      '<a class="backlink" href="#note-abc123">Roadmap</a>'
    );
  });

  test('backlink to a missing note stays plain', () => {
    const html = renderMarkdown('See [[Unknown Note]]', []);
    expect(html).toContain('[[Unknown Note]]');
    expect(html).not.toContain('href="#note-');
  });

  test('escapes HTML in input', () => {
    expect(renderMarkdown('<script>alert(1)</script>')).toContain('&lt;script&gt;');
  });

  test('empty input renders empty', () => {
    expect(renderMarkdown('')).toBe('');
  });
});

describe('getWordCount', () => {
  test('counts words ignoring markdown syntax', () => {
    expect(getWordCount('hello world')).toBe(2);
    expect(getWordCount('# heading **bold** text')).toBe(3);
    expect(getWordCount('')).toBe(0);
  });
});

describe('highlightText', () => {
  test('highlights matching words', () => {
    const html = highlightText('quick brown fox', ['quick']);
    expect(html).toContain('<mark>quick</mark>');
  });

  test('escapes text when no words given', () => {
    expect(highlightText('<b>', [])).toBe('&lt;b&gt;');
  });

  test('case-insensitive match', () => {
    expect(highlightText('Note', ['note'])).toContain('<mark>Note</mark>');
  });
});

describe('helpers', () => {
  test('esc escapes special chars', () => {
    expect(esc('<a href="x">')).toBe('&lt;a href=&quot;x&quot;&gt;');
  });

  test('stripMd removes markdown syntax', () => {
    expect(stripMd('# **bold** text')).toBe('bold text');
  });

  test('parseTags splits and trims', () => {
    expect(parseTags('work, ideas,')).toEqual(['work', 'ideas']);
  });

  test('fromLocalInput parses datetime-local string', () => {
    const ts = fromLocalInput('2026-08-17T10:30');
    expect(ts).not.toBeNull();
    expect(new Date(ts!).getHours()).toBe(10);
    expect(fromLocalInput('')).toBeNull();
  });
});