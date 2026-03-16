import { SourceAdapter, SecurityPolicy } from '../adapters/source_adapter.js';

export type SecurityLevel = 'public' | 'protected' | 'sealed';

export interface SecurityCheckResult {
    allowed: boolean;
    level: SecurityLevel;
    reason?: string;
}

export interface SecurityEvent {
    timestamp: number;
    event_type: 'access_denied' | 'write_attempt' | 'seal_violation';
    path: string;
    operation: 'read' | 'write';
    user_id?: string;
    details?: string;
}

export class SecurityGate {
    private sourceAdapter: SourceAdapter;
    private securityEvents: SecurityEvent[] = [];
    private enforceSealed: boolean = true;

    constructor(sourceAdapter?: SourceAdapter) {
        this.sourceAdapter = sourceAdapter || new SourceAdapter();
    }

    checkAccess(path: string, operation: 'read' | 'write'): SecurityCheckResult {
        const security = this.sourceAdapter.getSecurityPolicy();
        
        const mappedPath = this.mapXiaonuanPath(path);
        
        if (this.enforceSealed && this.isSealedPath(mappedPath, security)) {
            this.logEvent({
                timestamp: Date.now(),
                event_type: 'seal_violation',
                path: mappedPath,
                operation,
                details: 'Attempted access to SEALED layer'
            });
            
            return {
                allowed: false,
                level: 'sealed',
                reason: 'SEALED layer access denied - logging security event'
            };
        }

        if (this.isProtectedPath(mappedPath, security)) {
            if (operation === 'write') {
                this.logEvent({
                    timestamp: Date.now(),
                    event_type: 'write_attempt',
                    path: mappedPath,
                    operation,
                    details: 'Write to PROTECTED layer attempted'
                });
            }
            
            return {
                allowed: true,
                level: 'protected',
                reason: operation === 'write' ? 'Write to PROTECTED layer should be local only' : undefined
            };
        }

        return {
            allowed: true,
            level: 'public'
        };
    }
    
    private mapXiaonuanPath(path: string): string {
        const mapping: Record<string, string> = {
            '/xiaonuan/': '',
            '/xiaonuan/memory_bank/': 'memory_bank/',
            '/xiaonuan/master/': 'master/',
            '/xiaonuan/soul/': 'soul/',
            '/xiaonuan/task/': 'task/',
            '/xiaonuan/skills/': 'skills/',
            '/xiaonuan/secure_bank/': 'secure_bank/'
        };
        
        for (const [key, value] of Object.entries(mapping)) {
            if (path.startsWith(key)) {
                return value + path.slice(key.length);
            }
        }
        
        return path;
    }

    private isSealedPath(path: string, security: SecurityPolicy): boolean {
        return security.sealed_paths.some((sealedPath: string) => 
            path.includes(sealedPath) || path.includes('secure_bank')
        );
    }

    private isProtectedPath(path: string, security: SecurityPolicy): boolean {
        return security.protected_paths.some((protectedPath: string) => 
            path.includes(protectedPath)
        ) || path.includes('master_') || path.includes('soul_');
    }

    private logEvent(event: SecurityEvent): void {
        this.securityEvents.push(event);
        
        if (this.securityEvents.length > 1000) {
            this.securityEvents = this.securityEvents.slice(-500);
        }
    }

    getSecurityEvents(limit: number = 50): SecurityEvent[] {
        return this.securityEvents.slice(-limit);
    }

    setEnforceSealed(enforce: boolean): void {
        this.enforceSealed = enforce;
    }

    shouldBlockOutput(content: string): boolean {
        const sealedPatterns = [
            /key[_-]?\d+/i,
            /password/i,
            /api[_-]?key/i,
            /secret/i,
            /private[_-]?key/i,
            /-----BEGIN.*PRIVATE KEY-----/,
            /secure[_-]?message/i
        ];

        for (const pattern of sealedPatterns) {
            if (pattern.test(content)) {
                this.logEvent({
                    timestamp: Date.now(),
                    event_type: 'seal_violation',
                    path: 'output_content',
                    operation: 'read',
                    details: `Potential SEALED content detected: ${pattern.source}`
                });
                return true;
            }
        }

        return false;
    }
}

export const defaultSecurityGate = new SecurityGate();
