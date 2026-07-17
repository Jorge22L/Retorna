/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    session?: {
      id: string;
      userId: string;
      expiresAt: Date;
    };
    user?: {
      id: string;
      username: string;
      fullName: string;
      roles: string[];
    };
  }
}