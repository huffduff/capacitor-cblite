module.exports = {
  extends: [
    '@ionic/eslint-config/recommended',
    'airbnb-base',
    'airbnb-typescript/base',
  ],
  parserOptions: {
    project: './tsconfig.json',
  },
  rules: {
    'no-underscore-dangle': 'off',
  },
};
