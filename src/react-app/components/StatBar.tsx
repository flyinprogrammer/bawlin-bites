export function StatBar({ label, value }: { label: string; value: number }) {
	return (
		<div className="stat">
			<span className="stat-label">{label}</span>
			<span className="stat-pips" aria-label={`${label} ${value} out of 5`}>
				{[1, 2, 3, 4, 5].map((i) => (
					<span key={i} className={i <= value ? "pip on" : "pip"} />
				))}
			</span>
		</div>
	);
}
