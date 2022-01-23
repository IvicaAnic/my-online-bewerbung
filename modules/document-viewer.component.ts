import { Component, Input, NgZone, OnDestroy, OnChanges, SimpleChanges, Output, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { take } from 'rxjs/operators';
import { Subscription, interval, timer } from 'rxjs';
import { EventEmitter } from '@angular/core';

// eslint-disable-next-line no-var
declare var mammoth;

// eslint-disable-next-line @typescript-eslint/naming-convention
export type viewerType = 'Ausbildungszeugnisse1' | 'office' | 'Ausbildungszeugnisse' | 'Lebenslauf' | 'Bewerbung';
@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'ngx-doc-viewer',
    templateUrl: 'document-viewer.component.html',
    styles: [`:host {
        display: block;
    }
    .container {
        width: 100%;
        height: 100%;
        position: relative;
    }
    .overlay-popout-google {
        width: 40px;
        height: 40px;
        right: 26px;
        top: 11.5px;
        position: absolute;
        z-index: 1000;
    }
    .overlay-popout-office {
        width: 100px;
        height: 20px;
        right: 0;
        bottom: 0;
        position: absolute;
        z-index: 1000;
    }
    .overlay-full {
        width: 100%;
        height: 100%;
        right: 0;
        top: 0;
        position: absolute;
        z-index: 1000;
    }
    iframe {
        width: 100%;
        height: 100%;
    }
    `]
})
export class NgxDocViewerComponent implements OnChanges, OnDestroy {
    @Output() loaded: EventEmitter<any> = new EventEmitter();
    @Input() url = '';
    @Input() queryParams = '';
    @Input() viewerUrl = '';
    @Input() googleCheckInterval = 3000;
    @Input() disableContent: 'none' | 'all' | 'popout' | 'popout-hide' = 'none';
    @Input() googleCheckContentLoaded = true;
    @Input() viewer: viewerType;
    @ViewChildren('iframe') iframes: QueryList<ElementRef>;

    public fullUrl: SafeResourceUrl = null;
    public externalViewer = false;
    public docHtml = '';
    public configuredViewer: viewerType = 'Ausbildungszeugnisse1';
    private checkIFrameSubscription: Subscription = null;

    constructor(private domSanitizer: DomSanitizer, private ngZone: NgZone) { }

    ngOnDestroy(): void {
        if (this.checkIFrameSubscription) {
            this.checkIFrameSubscription.unsubscribe();
        }
    }

    async ngOnChanges(changes: SimpleChanges): Promise<void> {
        if (changes && changes.viewer && (changes.viewer.isFirstChange || changes.viewer.currentValue !== changes.viewer.previousValue)) {
            if (this.viewer !== 'Ausbildungszeugnisse1' && this.viewer !== 'office' &&
                this.viewer !== 'Ausbildungszeugnisse' && this.viewer !== 'Lebenslauf' && this.viewer !== 'Bewerbung') {
                console.error(`Unsupported viewer: '${this.viewer}'. Supported viewers: google, office, mammoth and pdf`);
            }
            
            this.configuredViewer = this.viewer;
        }
        if (this.disableContent !== 'none' && this.viewer !== 'Ausbildungszeugnisse1') {

        }
        if ((changes.url && changes.url.currentValue !== changes.url.previousValue) ||
            changes.viewer && changes.viewer.currentValue !== changes.viewer.previousValue ||
            changes.viewerUrl && changes.viewerUrl.currentValue !== changes.viewerUrl.previousValue) {
            if (!changes.viewerUrl) {
                this.viewerUrl = null;
            }
            switch (this.configuredViewer) {
                case 'Ausbildungszeugnisse':
                    this.viewerUrl = null;
                    break;
                case 'office': {
                    this.viewerUrl = null;
                    break;
                }
                case 'Lebenslauf': {
                    this.viewerUrl = null;
                    break;
                }
            }
            this.docHtml = '';
            this.externalViewer = this.configuredViewer === 'Ausbildungszeugnisse1' || this.configuredViewer === 'office' ||
                this.configuredViewer === 'Bewerbung';
            if (this.checkIFrameSubscription) {
                this.checkIFrameSubscription.unsubscribe();
            }
            if (!this.url) {
                this.fullUrl = null;
            } else if (this.configuredViewer === 'office' || this.configuredViewer === 'Ausbildungszeugnisse1'
                || this.configuredViewer === 'Lebenslauf' || this.configuredViewer === 'Bewerbung') {
                const u = this.url.indexOf('/') ? encodeURIComponent(this.url) : this.url;
                let url = this.viewerUrl ? this.viewerUrl.replace('%URL%', u) : this.url;
                if (!!this.queryParams && this.configuredViewer !== 'Lebenslauf' && this.configuredViewer !== 'Bewerbung') {
                    const start = this.queryParams.startsWith('&') ? '' : '&';
                    url = `${url}${start}${this.queryParams}`;
                }
                this.fullUrl = this.domSanitizer.bypassSecurityTrustResourceUrl(url);
                // see:
                // https://stackoverflow.com/questions/40414039/google-docs-viewer-returning-204-responses-no-longer-working-alternatives
                // hack to reload iframe if it's not loaded.
                // would maybe be better to use view.officeapps.live.com but seems not to work with sas token.
                if (this.configuredViewer === 'Ausbildungszeugnisse1' && this.googleCheckContentLoaded) {
                    this.ngZone.runOutsideAngular(() => {
                        // if it's not loaded after the googleIntervalCheck, then open load again.
                        this.checkIFrameSubscription = timer(100, this.googleCheckInterval)
                            .pipe(
                                take(Math.round(this.googleCheckInterval === 0 ? 0 : 20000 / this.googleCheckInterval)))
                            .subscribe(() => {
                                const iframe = this.iframes?.first?.nativeElement;
                                this.reloadIFrame(iframe);
                            });
                    });
                }
            } 
        }
    }

    iframeLoaded() {
        this.loaded.emit(null);
        if (this.checkIFrameSubscription) {
            this.checkIFrameSubscription.unsubscribe();
        }
    }

    reloadIFrame(iframe: HTMLIFrameElement) {
        if (iframe) {
            console.log('reloading..');
            iframe.src = iframe.src;
        }
    }

    private async getDocxToHtml(url: string) {
        const arrayBuffer = await this.fileToArray(url);
        const resultObject = await mammoth.convertToHtml({ arrayBuffer });
        return resultObject.value;
    }

    private fileToArray(url: string): Promise<ArrayBuffer> {
        return new Promise<ArrayBuffer>((resolve, reject) => {
            try {
                const request = new XMLHttpRequest();
                request.open('GET', url, true);
                request.responseType = 'blob';
                request.onload = () => {
                    const reader = new FileReader();
                    reader.readAsArrayBuffer(request.response);
                    reader.onloadend = (e) => {
                        resolve(reader.result as ArrayBuffer);
                    };
                };
                request.send();
            } catch {
                reject(`error while retrieving file ${url}.`);
            }
        });
    }
}
