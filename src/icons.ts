import { html } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import arrowBack from '@material-symbols/svg-400/rounded/arrow_back.svg?raw';
import attachFile from '@material-symbols/svg-400/rounded/attach_file.svg?raw';
import checkCircle from '@material-symbols/svg-400/rounded/check_circle.svg?raw';
import close from '@material-symbols/svg-400/rounded/close.svg?raw';
import contentCopy from '@material-symbols/svg-400/rounded/content_copy.svg?raw';
import download from '@material-symbols/svg-400/rounded/download.svg?raw';
import description from '@material-symbols/svg-400/rounded/description.svg?raw';
import edit from '@material-symbols/svg-400/rounded/edit.svg?raw';
import hub from '@material-symbols/svg-400/rounded/hub.svg?raw';
import link from '@material-symbols/svg-400/rounded/link.svg?raw';
import person from '@material-symbols/svg-400/rounded/person.svg?raw';
import save from '@material-symbols/svg-400/rounded/save.svg?raw';
import send from '@material-symbols/svg-400/rounded/send.svg?raw';
import share from '@material-symbols/svg-400/rounded/share.svg?raw';
import swap from '@material-symbols/svg-400/rounded/swap_horiz.svg?raw';
import upload from '@material-symbols/svg-400/rounded/upload.svg?raw';
import uploadFile from '@material-symbols/svg-400/rounded/upload_file.svg?raw';

const icons = {
  arrowBack,
  attachFile,
  checkCircle,
  close,
  contentCopy,
  download,
  description,
  edit,
  hub,
  link,
  person,
  save,
  send,
  share,
  swap,
  upload,
  uploadFile
};

export type MaterialIcon = keyof typeof icons;

export function materialIcon(name: MaterialIcon, button = false) {
  return button
    ? html`<md-icon slot="icon">${unsafeSVG(icons[name])}</md-icon>`
    : html`<md-icon>${unsafeSVG(icons[name])}</md-icon>`;
}
