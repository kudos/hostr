export const SET_STACK = 'SET_STACK';
export const ADD_FILE = 'ADD_FILE';
export const DELETE_FILE = 'DELETE_FILE';
export const SET_FILE = 'SET_FILE';
export const SET_FILES = 'SET_FILES';
export const SET_TOKEN = 'SET_TOKEN';
export const SET_USER = 'SET_USER';
export const LOGOUT_USER = 'LOGOUT_USER';


export function setStack(stack) {
  return { type: SET_STACK, stack };
}

export function deleteFile(index) {
  return { type: DELETE_FILE, index };
}

export function setFile(file) {
  return { type: SET_FILE, file };
}

export function setFiles(files) {
  return { type: SET_FILES, files };
}

export function setToken(token) {
  return { type: SET_TOKEN, token };
}

export function setUser(user) {
  return { type: SET_USER, user };
}

export function logoutUser(index) {
  return { type: LOGOUT_USER, index };
}
