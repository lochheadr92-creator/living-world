import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['review_evidence/whole_repo_b2cf812/**/*.test.ts'],
    watch: false,
  },
});
