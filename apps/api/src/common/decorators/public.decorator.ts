import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Skips authentication for a route or controller. Everything else needs a valid token. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
