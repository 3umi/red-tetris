export class Player {
    name: string;
    id: string;
    alive: boolean;

    constructor(name: string, id: string) {
        this.name = name;
        this.id = id;
        this.alive = true;
    }

    lose(): void {
        this.alive = false;
    }
    
    reset(): void {
        this.alive = true;
    }
}
