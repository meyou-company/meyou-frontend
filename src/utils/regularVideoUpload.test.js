import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  REGULAR_VIDEO_MAX_BYTES,
  REGULAR_VIDEO_MAX_MB,
  RegularVideoUploadError,
  assertRegularVideoFile,
  getRegularVideoErrorMessage,
  getRegularVideoIssue,
  isRegularVideoFile,
  resolveRegularVideoMime,
} from './regularVideoUpload.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function fakeFile({ name, type = '', size = 1024 }) {
  return { name, type, size, lastModified: 1 };
}

describe('regular video MIME', () => {
  it('accepts iPhone MOV with empty MIME from the filename', () => {
    const file = fakeFile({ name: 'IMG_2160x3840.MOV', type: '' });
    assert.equal(resolveRegularVideoMime(file), 'video/quicktime');
    assert.equal(isRegularVideoFile(file), true);
  });

  it('accepts M4V and MP4', () => {
    assert.equal(
      resolveRegularVideoMime(fakeFile({ name: 'clip.m4v', type: '' })),
      'video/mp4',
    );
    assert.equal(
      resolveRegularVideoMime(fakeFile({ name: 'clip.mp4', type: 'video/mp4' })),
      'video/mp4',
    );
  });

  it('keeps an explicit video MIME from the browser', () => {
    assert.equal(
      resolveRegularVideoMime(
        fakeFile({ name: 'clip.mov', type: 'video/quicktime' }),
      ),
      'video/quicktime',
    );
  });
});

describe('regular video size limit', () => {
  it('allows files up to 100 MB', () => {
    assert.equal(REGULAR_VIDEO_MAX_MB, 100);
    assert.equal(
      getRegularVideoIssue(
        fakeFile({ name: 'ok.mp4', type: 'video/mp4', size: REGULAR_VIDEO_MAX_BYTES }),
      ),
      null,
    );
  });

  it('rejects files over 100 MB', () => {
    const issue = getRegularVideoIssue(
      fakeFile({
        name: 'big.mov',
        type: '',
        size: REGULAR_VIDEO_MAX_BYTES + 1,
      }),
    );
    assert.equal(issue?.code, 'tooLarge');
    assert.throws(
      () =>
        assertRegularVideoFile(
          fakeFile({ name: 'big.mp4', type: 'video/mp4', size: REGULAR_VIDEO_MAX_BYTES + 1 }),
        ),
      RegularVideoUploadError,
    );
  });
});

describe('regular video error copy', () => {
  it('translates tooLarge with the 100 MB limit', () => {
    const error = new RegularVideoUploadError('tooLarge');
    const message = getRegularVideoErrorMessage(error, (key, vars) => {
      if (key === 'video.upload.errors.tooLarge') {
        return `Video must be ${vars.maxMb} MB or smaller`;
      }
      return key;
    });
    assert.equal(message, 'Video must be 100 MB or smaller');
  });

  it('does not steal non-video error messages', () => {
    assert.equal(
      getRegularVideoErrorMessage(new Error('Image size must be 5MB or less'), () => 'nope'),
      null,
    );
  });
});

describe('isolation from Stories and photos', () => {
  it('does not change the Stories 80 MB video cap', () => {
    const source = readFileSync(join(root, 'services/storyMediaUploadApi.js'), 'utf8');
    assert.match(source, /const MAX_VIDEO_SIZE = 80 \* 1024 \* 1024/);
    assert.doesNotMatch(source, /regularVideoUpload/);
  });

  it('does not change photo upload size or the image upload helper', () => {
    const source = readFileSync(join(root, 'services/postImageUploadApi.js'), 'utf8');
    assert.match(source, /const MAX_IMAGE_SIZE_BYTES = 5 \* 1024 \* 1024/);
    assert.match(source, /export async function uploadPostImage/);
    assert.doesNotMatch(source, /MAX_VIDEO_SIZE_BYTES = 80/);
  });
});
