import {defineConfig} from 'eslint/config';
import gnome from 'eslint-config-gnome';

export default defineConfig([
    gnome.configs.recommended,
    {
        languageOptions: {
            sourceType: 'module',
            globals: {
                global: 'readonly',
                _: 'readonly',
                C_: 'readonly',
                N_: 'readonly',
                ngettext: 'readonly',
            },
        },
        rules: {
            'no-unused-vars': ['error', {
                args: 'none',
                vars: 'local',
            }],
        },
    },
]);
