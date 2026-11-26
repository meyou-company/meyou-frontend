import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { compile } from 'sass';
import postcss from 'postcss';

const css = postcss.parse(compile(resolve('src/components/Stories/StoryUploadModal.scss')).css);
function values(selector, property, desktop = false) {
  const found = [];
  css.walkRules(selector, rule => {
    if (desktop && !(rule.parent.type === 'atrule' && rule.parent.params === '(min-width: 1024px)')) return;
    rule.walkDecls(property, declaration => found.push(declaration.value));
  });
  return found;
}

describe('Stories desktop and scroll style contracts', () => {
  it('keeps desktop picker and editor text readable', () => {
    expect(values('.storyUploadModal:not(.storyUploadModal--editorMode) .storyUploadModal__title', 'font-size', true)).toContain('24px');
    expect(values('.storyUploadModal:not(.storyUploadModal--editorMode) .storyUploadModal__pickFileBtn', 'font-size', true)).toContain('18px');
    expect(values('.storyUploadModal--editorMode .storyUploadModal__audienceBtn', 'font-size', true)).toContain('16px');
  });
  it('keeps padding around the desktop tool icons', () => {
    expect(values('.storyUploadModal--editorMode .storyUploadModal__editorTool', 'width', true)).toContain('44px');
    expect(values('.storyUploadModal--editorMode .storyUploadModal__editorTool', 'padding', true)).toContain('10px');
  });
  it('hides the filter scrollbar without disabling touch scrolling', () => {
    expect(values('.storyPhotoPanel__filters', 'overflow-x')).toContain('auto');
    expect(values('.storyPhotoPanel__filters', 'scrollbar-width')).toContain('none');
    expect(values('.storyPhotoPanel__filters', 'touch-action')).toContain('pan-x');
    expect(values('.storyPhotoPanel__filters::-webkit-scrollbar', 'display')).toContain('none');
  });
  it('hides internal emoji picker scrollbars', () => {
    const hidden = [];
    css.walkRules(rule => {
      if (rule.selector.includes('.storyPhotoPanel--emoji .EmojiPickerReact *')) rule.walkDecls('scrollbar-width', declaration => hidden.push(declaration.value));
    });
    expect(hidden).toContain('none');
  });
});
