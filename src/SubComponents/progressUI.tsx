import * as React from 'react';

export interface ProgressProps {
    progress: number;
}

export interface ProgressState {
    progress: number;
}

export class ProgressBar extends React.Component<ProgressProps, ProgressState> {
    constructor(props: ProgressProps) {
        super(props);

        this.state = {
            progress: this.props.progress
        };
    }

    componentWillReceiveProps(nextProps: ProgressProps) {
        // You don't have to do this check first, but it can help prevent an unneeded render
        if (nextProps.progress !== this.state.progress) {
            this.setState({ progress: nextProps.progress });
        }
    }

    render() {
        return (
            <div className="progress">
                <div className="inner" style={{width: this.state.progress * 100 + "%"}}></div>
                <div className="label">{(this.state.progress * 100).toFixed(2) + "%"}</div>
            </div>
        );
    }
}