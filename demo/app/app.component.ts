import { Component } from '@angular/core';
import { viewerType } from 'modules/document-viewer.component';
import { getbaseUrl } from 'demo/utils';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styles: []
})
export class AppComponent {
  viewers: { name: viewerType; docs: string[]; custom: boolean; acceptedUploadTypes: string; viewerUrl?: string }[] = [
   
    {
      name: 'pdf', docs: [
        `${getbaseUrl()}/assets/IvicaAnicLebensLauf.pdf`
      ], custom: false, acceptedUploadTypes: 'application/pdf'
    },
    
  ];
  selectedViewer = this.viewers[0];
  selectedDoc = this.selectedViewer.docs[0];

  constructor() { }
  selectViewer(viewerName: viewerType) {
    if (viewerName !== this.selectViewer.name) {
      this.selectedViewer = this.viewers.find(v => v.name === viewerName);
      this.selectedDoc = this.selectedViewer.docs[0];
    }
  }

  getDocExtension(doc: string) {
    const splittedDoc = doc.split('.');
    return splittedDoc[splittedDoc.length - 1];
  }

  handleFiles(fileInput: any) {
    if (fileInput.target.files && fileInput.target.files[0]) {
      const reader = new FileReader();

      reader.onload = (e: any) => {
        this.selectedDoc = e.target.result;
      };
      reader.readAsDataURL(fileInput.target.files[0]);
    }
  }

}
