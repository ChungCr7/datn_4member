import * as bcrypt from 'bcrypt';

const saltRounds = 10;

export const hashPasswordHelper = async (plainPassword: string) => {
  try {
    return await bcrypt.hash(plainPassword, saltRounds);
  } catch (error) {
    throw new Error('Password hashing failed');
  }
};

export const comparePasswordHelper = async (
  plainPassword: string,
  hashPassword: string,
) => {
  try {
    return await bcrypt.compare(plainPassword, hashPassword);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

export const hashTokenHelper = async (token: string) => {
  try {
    return await bcrypt.hash(token, saltRounds);
  } catch (error) {
    throw new Error('Token hashing failed');
  }
};

export const compareTokenHelper = async (token: string, hashToken: string) => {
  try {
    return await bcrypt.compare(token, hashToken);
  } catch (error) {
    throw new Error('Token comparison failed');
  }
};

export const generateResetCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const validateResetCode = (code: string): boolean => {
  return /^\d{6}$/.test(code);
};
