import { createTheme, type MantineColorsTuple } from '@mantine/core';

// Cool silver-blue brand scale for the gallery.
const silver: MantineColorsTuple = [
  '#eef4f6',
  '#dde6ea',
  '#b6cbd3',
  '#8caebb',
  '#6995a7',
  '#53869b',
  '#467e95',
  '#366b81',
  '#2c5d6e',
  '#1b505f',
];

export const theme = createTheme({
  primaryColor: 'silver',
  colors: { silver },
  fontFamily: '"Vazirmatn Variable", Tahoma, sans-serif',
  headings: { fontFamily: '"Vazirmatn Variable", Tahoma, sans-serif' },
  defaultRadius: 'md',
  cursorType: 'pointer',
});
