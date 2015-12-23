import { combineReducers } from 'redux';
import { SET_STACK, ADD_FILE, DELETE_FILE, SET_USER, LOGOUT_USER, SET_FILE, SET_FILES, SET_TOKEN } from './actions.js';

function files(state = [], action) {
  switch (action.type) {
  case ADD_FILE:
    return [
      action.file,
      ...state,
    ];
  case DELETE_FILE:
    return [
      ...state.slice(0, action.index),
      ...state.slice(action.index + 1),
    ];
  case SET_FILES:
    return action.files;
  default:
    return state;
  }
}

function file(state = null, action) {
  switch (action.type) {
  case SET_FILE:
    return action.file;
  default:
    return state;
  }
}

function stack(state = null, action) {
  switch (action.type) {
  case SET_STACK:
    return action.stack;
  default:
    return state;
  }
}


function stacks(state = null, action) {
  switch (action.type) {
  case SET_STACK:
    return action.stacks;
  default:
    return state;
  }
}

function user(state = null, action) {
  switch (action.type) {
  case SET_USER:
    return action.user;
  case LOGOUT_USER:
    return {};
  default:
    return state;
  }
}

function token(state = null, action) {
  switch (action.type) {
  case SET_TOKEN:
    return action.token;
  default:
    return state;
  }
}

export default combineReducers({
  file,
  files,
  stack,
  stacks,
  user,
  token,
});
